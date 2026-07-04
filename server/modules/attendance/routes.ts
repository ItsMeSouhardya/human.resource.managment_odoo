import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const attendanceRouter = Router();

const markSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"]).default("PRESENT")
});

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatTime(value?: Date | null) {
  if (!value) return "-";
  return value.toISOString().slice(11, 16);
}

function statusLabel(status: string) {
  return status === "HALF_DAY" ? "Half-day" : status.charAt(0) + status.slice(1).toLowerCase();
}

function hoursBetween(checkIn?: Date | null, checkOut?: Date | null, fallbackStatus?: string) {
  if (fallbackStatus === "HALF_DAY") return "04:00";
  if (fallbackStatus === "ABSENT" || fallbackStatus === "LEAVE") return "00:00";
  if (!checkIn || !checkOut) return "00:00";
  const minutes = Math.max(Math.round((checkOut.getTime() - checkIn.getTime()) / 60000), 0);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function attendanceToDto(record: any) {
  const workHours = hoursBetween(record.checkInAt, record.checkOutAt, record.status);
  const [hours, minutes] = workHours.split(":").map(Number);
  const extraMinutes = Math.max(hours * 60 + minutes - 8 * 60, 0);
  return {
    id: record.id,
    employeeId: record.employeeId,
    date: record.workDate.toISOString().slice(0, 10),
    status: statusLabel(record.status),
    checkIn: formatTime(record.checkInAt),
    checkOut: formatTime(record.checkOutAt),
    workHours,
    extraHours: `${String(Math.floor(extraMinutes / 60)).padStart(2, "0")}:${String(extraMinutes % 60).padStart(2, "0")}`
  };
}

async function upsertToday(employeeId: string, status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE", checkOut = false) {
  const workDate = startOfToday();
  const now = new Date();
  const checkInAt = status === "ABSENT" || status === "LEAVE" ? null : now;
  const checkOutAt = checkOut || status === "HALF_DAY" ? now : null;

  return prisma.attendanceRecord.upsert({
    where: { employeeId_workDate: { employeeId, workDate } },
    update: { status, checkInAt, checkOutAt },
    create: { employeeId, workDate, status, checkInAt, checkOutAt }
  });
}

attendanceRouter.post("/check-in", requireAuth, async (request, response) => {
  const parsed = markSchema.safeParse(request.body ?? {});
  if (!parsed.success) return response.status(400).json({ message: "Invalid attendance status" });
  const record = await upsertToday(request.session!.employeeId, parsed.data.status);
  response.json({ attendance: attendanceToDto(record) });
});

attendanceRouter.post("/check-out", requireAuth, async (request, response) => {
  const record = await upsertToday(request.session!.employeeId, "PRESENT", true);
  response.json({ attendance: attendanceToDto(record) });
});

attendanceRouter.get("/me", requireAuth, async (request, response) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId: request.session!.employeeId },
    orderBy: { workDate: "desc" }
  });
  response.json({ attendanceRecords: records.map(attendanceToDto) });
});

attendanceRouter.get("/", requireAuth, requireRole("ADMIN", "HR"), async (_request, response) => {
  const records = await prisma.attendanceRecord.findMany({
    orderBy: { workDate: "desc" }
  });
  response.json({ attendanceRecords: records.map(attendanceToDto) });
});
