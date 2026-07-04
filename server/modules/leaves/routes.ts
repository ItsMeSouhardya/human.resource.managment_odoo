import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const leaveRouter = Router();

const leaveRequestSchema = z.object({
  leaveType: z.enum(["Paid", "Sick", "Unpaid"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
  remarks: z.string().trim().max(500).optional()
}).refine((value) => value.endDate >= value.startDate, {
  path: ["endDate"],
  message: "End date cannot be before start date"
});

const reviewSchema = z.object({
  comment: z.string().trim().max(500).optional()
});

function typeToDb(value: string) {
  return value.toUpperCase();
}

function typeFromDb(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function statusFromDb(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function leaveToDto(request: any) {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
    leaveType: typeFromDb(request.leaveType),
    startDate: dateOnly(request.startsOn),
    endDate: dateOnly(request.endsOn),
    remarks: request.remarks ?? "",
    status: statusFromDb(request.status),
    adminComment: request.reviewerComment ?? undefined
  };
}

const includeEmployee = { employee: true };

leaveRouter.post("/", requireAuth, async (request, response) => {
  const parsed = leaveRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: "Please fix the highlighted fields",
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    });
  }

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId: request.session!.employeeId,
      leaveType: typeToDb(parsed.data.leaveType),
      startsOn: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
      endsOn: new Date(`${parsed.data.endDate}T00:00:00.000Z`),
      remarks: parsed.data.remarks ?? null
    },
    include: includeEmployee
  });

  response.status(201).json({ leaveRequest: leaveToDto(created) });
});

leaveRouter.get("/me", requireAuth, async (request, response) => {
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: request.session!.employeeId },
    include: includeEmployee,
    orderBy: { createdAt: "desc" }
  });
  response.json({ leaveRequests: requests.map(leaveToDto) });
});

leaveRouter.get("/", requireAuth, requireRole("ADMIN", "HR"), async (_request, response) => {
  const requests = await prisma.leaveRequest.findMany({
    include: includeEmployee,
    orderBy: { createdAt: "desc" }
  });
  response.json({ leaveRequests: requests.map(leaveToDto) });
});

async function reviewLeave(id: string, reviewerId: string, status: "APPROVED" | "REJECTED", comment?: string) {
  return prisma.$transaction(async (tx) => {
    const reviewer = await tx.employee.findUnique({ where: { id: reviewerId } });
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerId,
        reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Admin/HR",
        reviewerComment: comment ?? (status === "APPROVED" ? "Approved by Admin/HR" : "Rejected by Admin/HR"),
        reviewedAt: new Date()
      },
      include: includeEmployee
    });

    if (status === "APPROVED") {
      await tx.attendanceRecord.upsert({
        where: { employeeId_workDate: { employeeId: updated.employeeId, workDate: updated.startsOn } },
        update: { status: "LEAVE", checkInAt: null, checkOutAt: null },
        create: { employeeId: updated.employeeId, workDate: updated.startsOn, status: "LEAVE" }
      });
    }

    return updated;
  });
}

leaveRouter.patch("/:id/approve", requireAuth, requireRole("ADMIN", "HR"), async (request, response) => {
  const parsed = reviewSchema.safeParse(request.body ?? {});
  if (!parsed.success) return response.status(400).json({ message: "Invalid review comment" });
  const updated = await reviewLeave(request.params.id, request.session!.employeeId, "APPROVED", parsed.data.comment);
  response.json({ leaveRequest: leaveToDto(updated) });
});

leaveRouter.patch("/:id/reject", requireAuth, requireRole("ADMIN", "HR"), async (request, response) => {
  const parsed = reviewSchema.safeParse(request.body ?? {});
  if (!parsed.success) return response.status(400).json({ message: "Invalid review comment" });
  const updated = await reviewLeave(request.params.id, request.session!.employeeId, "REJECTED", parsed.data.comment);
  response.json({ leaveRequest: leaveToDto(updated) });
});
