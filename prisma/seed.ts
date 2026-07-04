import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import type { UserRole } from "../src/shared/types.js";

const prisma = new PrismaClient();

type SeedEmployee = {
  employeeCode: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  department: string;
  designation: string;
  monthlyWage: number;
};

const seedEmployees: SeedEmployee[] = [
  {
    employeeCode: "OIARAD20260001",
    email: "admin@company.com",
    password: "Admin@123",
    role: "ADMIN",
    firstName: "Aarav",
    lastName: "Admin",
    phone: "+91 90000 00000",
    address: "Salt Lake, Kolkata",
    department: "Human Resources",
    designation: "System Administrator",
    monthlyWage: 82000,
  },
  {
    employeeCode: "OIHIRR20260002",
    email: "hr@company.com",
    password: "Hr@12345",
    role: "HR",
    firstName: "Hiral",
    lastName: "Rao",
    phone: "+91 90000 00002",
    address: "Indiranagar, Bengaluru",
    department: "Human Resources",
    designation: "HR Officer",
    monthlyWage: 64000,
  },
  {
    employeeCode: "OIDEVS20260003",
    email: "employee@company.com",
    password: "Employee@123",
    role: "EMPLOYEE",
    firstName: "Dev",
    lastName: "Sharma",
    phone: "+91 90000 00003",
    address: "New Town, Kolkata",
    department: "Engineering",
    designation: "Frontend Developer",
    monthlyWage: 50000,
  },
  {
    employeeCode: "OINEHS20260004",
    email: "neha@company.com",
    password: "Neha@1234",
    role: "EMPLOYEE",
    firstName: "Neha",
    lastName: "Singh",
    phone: "+91 90000 00004",
    address: "Andheri East, Mumbai",
    department: "Finance",
    designation: "Payroll Analyst",
    monthlyWage: 56000,
  },
  {
    employeeCode: "OIAISK20260005",
    email: "aisha@company.com",
    password: "Aisha@123",
    role: "EMPLOYEE",
    firstName: "Aisha",
    lastName: "Khan",
    phone: "+91 90000 00005",
    address: "Koregaon Park, Pune",
    department: "Design",
    designation: "Product Designer",
    monthlyWage: 60000,
  },
];

function salaryParts(monthlyWage: number) {
  const basicPay = monthlyWage * 0.5;
  const hra = basicPay * 0.5;
  const allowances = Math.max(monthlyWage - basicPay - hra, 0);
  const deductions = basicPay * 0.12 + 200;
  return { basicPay, hra, allowances, deductions };
}

async function departmentId(name: string) {
  const department = await prisma.department.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return department.id;
}

async function designationId(title: string) {
  const designation = await prisma.designation.upsert({
    where: { title },
    update: {},
    create: { title },
  });
  return designation.id;
}

async function upsertEmployee(input: SeedEmployee) {
  const passwordHash = await argon2.hash(input.password);
  const deptId = await departmentId(input.department);
  const desigId = await designationId(input.designation);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      role: input.role,
      isEmailVerified: true,
      employee: {
        update: {
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          address: input.address,
          departmentId: deptId,
          designationId: desigId,
        },
      },
    },
    create: {
      email: input.email,
      passwordHash,
      role: input.role,
      isEmailVerified: true,
      employee: {
        create: {
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          joinedOn: new Date("2026-01-01"),
          departmentId: deptId,
          designationId: desigId,
          phone: input.phone,
          address: input.address,
          leaveBalances: {
            create: [
              { leaveType: "PAID", totalDays: 24 },
              { leaveType: "SICK", totalDays: 10 },
              { leaveType: "UNPAID", totalDays: 30 },
            ],
          },
        },
      },
    },
    include: { employee: true },
  });

  const employeeId = user.employee!.id;
  const parts = salaryParts(input.monthlyWage);

  await prisma.payrollStructure.upsert({
    where: { employeeId },
    update: {
      monthlyWage: input.monthlyWage,
      workingDaysPerWeek: 5,
      breakTimeHours: 1,
      pfRate: 12,
      professionalTax: 200,
      ...parts,
    },
    create: {
      employeeId,
      monthlyWage: input.monthlyWage,
      workingDaysPerWeek: 5,
      breakTimeHours: 1,
      pfRate: 12,
      professionalTax: 200,
      effectiveFrom: new Date("2026-01-01"),
      ...parts,
    },
  });

  for (const leaveType of ["PAID", "SICK", "UNPAID"]) {
    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveType: { employeeId, leaveType } },
      update: {},
      create: { employeeId, leaveType, totalDays: leaveType === "PAID" ? 24 : leaveType === "SICK" ? 10 : 30 },
    });
  }

  for (const document of ["Aadhaar ID proof.pdf", "Employment contract.pdf", "Salary declaration.pdf"]) {
    const existing = await prisma.employeeDocument.findFirst({ where: { employeeId, name: document } });
    if (!existing) {
      await prisma.employeeDocument.create({
        data: {
          employeeId,
          type: document.includes("Salary") ? "PAYROLL" : "PROFILE",
          name: document,
          fileUrl: `/documents/${employeeId}/${document}`,
        },
      });
    }
  }

  return employeeId;
}

async function upsertAttendance(employeeId: string, date: string, status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE") {
  const workDate = new Date(`${date}T00:00:00.000Z`);
  const checkInAt = status === "ABSENT" || status === "LEAVE" ? null : new Date(`${date}T10:00:00.000Z`);
  const checkOutAt =
    status === "PRESENT" ? new Date(`${date}T19:00:00.000Z`) : status === "HALF_DAY" ? new Date(`${date}T14:00:00.000Z`) : null;

  await prisma.attendanceRecord.upsert({
    where: { employeeId_workDate: { employeeId, workDate } },
    update: { status, checkInAt, checkOutAt },
    create: { employeeId, workDate, status, checkInAt, checkOutAt },
  });
}

async function createLeaveIfMissing(employeeId: string, leaveType: string, startsOn: string, endsOn: string, status: string) {
  const existing = await prisma.leaveRequest.findFirst({
    where: { employeeId, startsOn: new Date(`${startsOn}T00:00:00.000Z`), leaveType },
  });

  if (!existing) {
    await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startsOn: new Date(`${startsOn}T00:00:00.000Z`),
        endsOn: new Date(`${endsOn}T00:00:00.000Z`),
        remarks: leaveType === "SICK" ? "Medical appointment" : "Family travel",
        status,
        reviewerName: status === "APPROVED" ? "Hiral Rao" : null,
        reviewerComment: status === "APPROVED" ? "Approved by HR" : null,
        reviewedAt: status === "APPROVED" ? new Date("2026-07-03T12:00:00.000Z") : null,
      },
    });
  }
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.salarySlip.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.payrollStructure.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const ids = new Map<string, string>();

  for (const employee of seedEmployees) {
    ids.set(employee.email, await upsertEmployee(employee));
  }

  await upsertAttendance(ids.get("employee@company.com")!, "2026-07-01", "PRESENT");
  await upsertAttendance(ids.get("employee@company.com")!, "2026-07-02", "HALF_DAY");
  await upsertAttendance(ids.get("hr@company.com")!, "2026-07-01", "LEAVE");
  await upsertAttendance(ids.get("neha@company.com")!, "2026-07-01", "ABSENT");
  await upsertAttendance(ids.get("aisha@company.com")!, "2026-07-01", "PRESENT");

  await createLeaveIfMissing(ids.get("employee@company.com")!, "PAID", "2026-07-08", "2026-07-09", "PENDING");
  await createLeaveIfMissing(ids.get("hr@company.com")!, "SICK", "2026-07-03", "2026-07-03", "APPROVED");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
