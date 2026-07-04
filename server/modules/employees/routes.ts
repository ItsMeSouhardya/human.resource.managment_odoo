import { Router } from "express";
import argon2 from "argon2";
import crypto from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const employeeRouter = Router();

const employeeUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  avatarUrl: z.string().trim().url().or(z.literal("")).nullable().optional(),
  department: z.string().trim().min(2).optional(),
  manager: z.string().trim().min(2).optional(),
  location: z.string().trim().min(2).optional()
});

const employeeCreateSchema = z.object({
  fullName: z.string().trim().min(3, "Employee name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7).max(20),
  department: z.string().trim().min(2),
  role: z.string().trim().min(2),
  address: z.string().trim().max(240).optional(),
  systemRole: z.enum(["EMPLOYEE", "HR"]).default("EMPLOYEE")
});

function isAdminRole(role?: string) {
  return role === "ADMIN" || role === "HR";
}

function nameParts(name: string) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts.shift() ?? name.trim();
  const lastName = parts.length > 0 ? parts.join(" ") : "Employee";
  return { firstName, lastName };
}

function employeeCode(fullName: string, joinedOn: Date, count: number) {
  const parts = fullName.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Employee";
  const last = parts.at(-1) ?? first;
  const initials = `${first.slice(0, 2)}${last.slice(0, 2)}`.toUpperCase();
  return `OI${initials}${joinedOn.getFullYear()}${String(count + 1).padStart(4, "0")}`;
}

function generatedPassword(name: string) {
  const clean = name.replace(/[^A-Za-z]/g, "").slice(0, 4) || "User";
  return `${clean[0].toUpperCase()}${clean.slice(1).toLowerCase()}@${crypto.randomInt(1000, 9999)}`;
}

function leaveTypeFromDb(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

async function ensureDepartment(name?: string) {
  if (!name) return undefined;
  const department = await prisma.department.upsert({
    where: { name },
    update: {},
    create: { name }
  });
  return department.id;
}

async function ensureDesignation(title?: string) {
  if (!title) return undefined;
  const designation = await prisma.designation.upsert({
    where: { title },
    update: {},
    create: { title }
  });
  return designation.id;
}

function employeeToCard(employee: any) {
  const lastAttendance = employee.attendanceRecords?.[0];
  const attendanceStatus = lastAttendance?.status;
  const status =
    attendanceStatus === "LEAVE"
      ? "leave"
      : attendanceStatus === "ABSENT"
        ? "absent"
        : "present";

  return {
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`,
    role: employee.designation?.title ?? employee.user.role,
    email: employee.user.email,
    phone: employee.phone ?? "",
    address: employee.address ?? "",
    avatarUrl: employee.avatarUrl ?? undefined,
    department: employee.department?.name ?? "Unassigned",
    manager: "HR Manager",
    location: employee.address?.split(",").at(-1)?.trim() || "Office",
    status,
    code: employee.employeeCode,
    documents: employee.documents?.map((document: any) => ({
      id: document.id,
      name: document.name,
      type: document.type,
      fileUrl: document.fileUrl
    })) ?? [],
    leaveBalances: employee.leaveBalances?.map((balance: any) => ({
      leaveType: leaveTypeFromDb(balance.leaveType),
      totalDays: balance.totalDays,
      usedDays: balance.usedDays
    })) ?? []
  };
}

const includeEmployeeCard = {
  user: true,
  department: true,
  designation: true,
  attendanceRecords: {
    orderBy: { workDate: "desc" as const },
    take: 1
  },
  documents: true,
  leaveBalances: true
};

employeeRouter.get("/", requireAuth, async (request, response) => {
  const where = isAdminRole(request.session?.role) ? {} : { id: request.session?.employeeId };
  const employees = await prisma.employee.findMany({
    where,
    include: includeEmployeeCard,
    orderBy: { createdAt: "asc" }
  });

  response.json({ employees: employees.map(employeeToCard) });
});

employeeRouter.get("/:id", requireAuth, async (request, response) => {
  if (!isAdminRole(request.session?.role) && request.params.id !== request.session?.employeeId) {
    return response.status(403).json({ message: "You can only view your own employee profile" });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: request.params.id },
    include: includeEmployeeCard
  });

  if (!employee) {
    return response.status(404).json({ message: "Employee not found" });
  }

  return response.json({ employee: employeeToCard(employee) });
});

employeeRouter.post("/", requireAuth, async (request, response) => {
  if (!isAdminRole(request.session?.role)) {
    return response.status(403).json({ message: "Only Admin/HR can create employees" });
  }

  const parsed = employeeCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: "Please fix the highlighted fields",
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    });
  }

  const input = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    return response.status(409).json({ message: "An account with this email already exists" });
  }

  const joinedOn = new Date();
  const password = generatedPassword(input.fullName);
  const passwordHash = await argon2.hash(password);
  const count = await prisma.employee.count({
    where: {
      joinedOn: {
        gte: new Date(`${joinedOn.getFullYear()}-01-01T00:00:00.000Z`),
        lt: new Date(`${joinedOn.getFullYear() + 1}-01-01T00:00:00.000Z`)
      }
    }
  });
  const { firstName, lastName } = nameParts(input.fullName);
  const departmentId = await ensureDepartment(input.department);
  const designationId = await ensureDesignation(input.role);

  const created = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.systemRole,
      isEmailVerified: true,
      employee: {
        create: {
          employeeCode: employeeCode(input.fullName, joinedOn, count),
          firstName,
          lastName,
          phone: input.phone,
          address: input.address ?? "",
          joinedOn,
          departmentId,
          designationId,
          leaveBalances: {
            create: [
              { leaveType: "PAID", totalDays: 24 },
              { leaveType: "SICK", totalDays: 10 },
              { leaveType: "UNPAID", totalDays: 30 }
            ]
          },
          documents: {
            create: [
              { type: "PROFILE", name: "Employment contract.pdf", fileUrl: "/documents/employment-contract.pdf" },
              { type: "PAYROLL", name: "Salary declaration.pdf", fileUrl: "/documents/salary-declaration.pdf" }
            ]
          }
        }
      }
    },
    include: { employee: { include: includeEmployeeCard } }
  });

  return response.status(201).json({
    employee: employeeToCard(created.employee),
    generatedPassword: password,
    message: "Employee created with a system-generated first password"
  });
});

employeeRouter.patch("/:id", requireAuth, async (request, response) => {
  if (!isAdminRole(request.session?.role) && request.params.id !== request.session?.employeeId) {
    return response.status(403).json({ message: "You can only edit your own employee profile" });
  }

  const parsed = employeeUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: "Please fix the highlighted fields",
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    });
  }

  const input = parsed.data;
  const admin = isAdminRole(request.session?.role);
  const employeeData: any = {};
  const userData: any = {};

  employeeData.phone = input.phone === undefined ? undefined : input.phone;
  employeeData.address = input.address === undefined ? undefined : input.address;
  employeeData.avatarUrl = input.avatarUrl === undefined ? undefined : input.avatarUrl || null;

  if (admin) {
    if (input.name) Object.assign(employeeData, nameParts(input.name));
    if (input.department) employeeData.departmentId = await ensureDepartment(input.department);
    if (input.role) employeeData.designationId = await ensureDesignation(input.role);
    if (input.email) userData.email = input.email.toLowerCase();
  }

  await prisma.employee.update({
    where: { id: request.params.id },
    data: {
      ...employeeData,
      ...(Object.keys(userData).length ? { user: { update: userData } } : {})
    }
  });

  const employee = await prisma.employee.findUnique({
    where: { id: request.params.id },
    include: includeEmployeeCard
  });

  return response.json({ employee: employeeToCard(employee) });
});
