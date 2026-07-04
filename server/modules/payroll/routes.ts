import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const payrollRouter = Router();

const payrollSchema = z.object({
  monthlyWage: z.number().min(0),
  workingDaysPerWeek: z.number().int().min(1).max(7),
  breakTimeHours: z.number().min(0).max(12),
  pfRate: z.number().min(0).max(100),
  professionalTax: z.number().min(0)
});

function components(monthlyWage: number, pfRate: number, professionalTax: number) {
  const basicPay = monthlyWage * 0.5;
  const hra = basicPay * 0.5;
  const allowances = Math.max(monthlyWage - basicPay - hra, 0);
  const deductions = basicPay * (pfRate / 100) + professionalTax;
  return { basicPay, hra, allowances, deductions };
}

function payrollToDto(payroll: any) {
  return {
    monthlyWage: Number(payroll.monthlyWage),
    workingDaysPerWeek: payroll.workingDaysPerWeek,
    breakTimeHours: Number(payroll.breakTimeHours),
    pfRate: Number(payroll.pfRate),
    professionalTax: Number(payroll.professionalTax)
  };
}

async function ensurePayroll(employeeId: string) {
  const existing = await prisma.payrollStructure.findUnique({ where: { employeeId } });
  if (existing) return existing;
  const derived = components(50000, 12, 200);
  return prisma.payrollStructure.create({
    data: {
      employeeId,
      monthlyWage: 50000,
      workingDaysPerWeek: 5,
      breakTimeHours: 1,
      pfRate: 12,
      professionalTax: 200,
      effectiveFrom: new Date(),
      ...derived
    }
  });
}

payrollRouter.get("/", requireAuth, requireRole("ADMIN", "HR"), async (_request, response) => {
  const payrolls = await prisma.payrollStructure.findMany();
  response.json({
    payrollByEmployee: Object.fromEntries(payrolls.map((payroll) => [payroll.employeeId, payrollToDto(payroll)]))
  });
});

payrollRouter.get("/me", requireAuth, async (request, response) => {
  const payroll = await ensurePayroll(request.session!.employeeId);
  response.json({ payroll: payrollToDto(payroll) });
});

payrollRouter.get("/:employeeId", requireAuth, requireRole("ADMIN", "HR"), async (request, response) => {
  const payroll = await ensurePayroll(request.params.employeeId);
  response.json({ payroll: payrollToDto(payroll) });
});

payrollRouter.patch("/:employeeId", requireAuth, requireRole("ADMIN", "HR"), async (request, response) => {
  const parsed = payrollSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: "Please fix the highlighted fields",
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    });
  }

  const derived = components(parsed.data.monthlyWage, parsed.data.pfRate, parsed.data.professionalTax);
  const payroll = await prisma.payrollStructure.upsert({
    where: { employeeId: request.params.employeeId },
    update: { ...parsed.data, ...derived },
    create: {
      employeeId: request.params.employeeId,
      effectiveFrom: new Date(),
      ...parsed.data,
      ...derived
    }
  });

  response.json({ payroll: payrollToDto(payroll) });
});
