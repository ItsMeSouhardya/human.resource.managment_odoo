import crypto from "node:crypto";
import argon2 from "argon2";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

export const authRouter = Router();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Company name is required"),
    fullName: z.string().trim().min(3, "Employee name is required"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z.string().trim().min(7, "Phone number is required").max(20, "Phone number is too long"),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["HR", "EMPLOYEE"])
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

const loginSchema = z.object({
  loginIdOrEmail: z.string().trim().min(1, "Login ID or email is required"),
  password: z.string().min(1, "Password is required")
});

const verifyEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  token: z.string().trim().min(8, "Verification token is required")
});

const resendVerificationSchema = z.object({
  loginIdOrEmail: z.string().trim().min(1, "Login ID or email is required")
});

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function companyPrefix(companyName: string) {
  const words = companyName
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (words[0] ?? "HR").slice(0, 2).padEnd(2, "X").toUpperCase();
}

function namePrefix(fullName: string) {
  const parts = fullName
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0] ?? "Employee";
  const last = parts.length > 1 ? parts[parts.length - 1] : first;

  return `${first.slice(0, 2)}${last.slice(0, 2)}`.toUpperCase();
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? fullName.trim();
  const lastName = parts.length > 0 ? parts.join(" ") : "Employee";

  return { firstName, lastName };
}

async function generateEmployeeCode(companyName: string, fullName: string, joinedOn: Date) {
  const year = joinedOn.getFullYear();
  const count = await prisma.employee.count({
    where: {
      joinedOn: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
      }
    }
  });
  const serial = String(count + 1).padStart(4, "0");

  return `${companyPrefix(companyName)}${namePrefix(fullName)}${year}${serial}`;
}

authRouter.post("/signup", async (request, response) => {
  const parsed = signupSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Please fix the highlighted fields", errors: formatZodError(parsed.error) });
  }

  const { companyName, fullName, email, phone, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    return response.status(409).json({ message: "An account with this email already exists" });
  }

  const joinedOn = new Date();
  const employeeCode = await generateEmployeeCode(companyName, fullName, joinedOn);
  const passwordHash = await argon2.hash(password);
  const verificationToken = crypto.randomBytes(24).toString("hex");
  const { firstName, lastName } = splitName(fullName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role,
        isEmailVerified: false,
        employee: {
          create: {
            employeeCode,
            firstName,
            lastName,
            phone,
            joinedOn,
            leaveBalances: {
              create: [
                { leaveType: "PAID", totalDays: 20 },
                { leaveType: "SICK", totalDays: 10 },
                { leaveType: "UNPAID", totalDays: 30 }
              ]
            }
          }
        }
      },
      include: { employee: true }
    });

    await tx.emailVerificationToken.create({
      data: {
        email: normalizedEmail,
        tokenHash: tokenHash(verificationToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });

    return created;
  });

  return response.status(201).json({
    message: "Account created. Verify the email before signing in.",
    employeeCode: user.employee?.employeeCode,
    verificationToken,
    verificationExpiresInHours: 24
  });
});

authRouter.post("/verify-email", async (request, response) => {
  const parsed = verifyEmailSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid verification request", errors: formatZodError(parsed.error) });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const verification = await prisma.emailVerificationToken.findFirst({
    where: {
      email: normalizedEmail,
      tokenHash: tokenHash(parsed.data.token),
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!verification) {
    return response.status(400).json({ message: "Verification token is invalid or expired" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: normalizedEmail },
      data: { isEmailVerified: true }
    }),
    prisma.emailVerificationToken.delete({ where: { id: verification.id } })
  ]);

  return response.json({ message: "Email verified. You can now sign in." });
});

authRouter.post("/resend-verification", async (request, response) => {
  const parsed = resendVerificationSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Enter your email or Login ID first", errors: formatZodError(parsed.error) });
  }

  const loginIdOrEmail = parsed.data.loginIdOrEmail.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: loginIdOrEmail.toLowerCase() }, { employee: { employeeCode: loginIdOrEmail.toUpperCase() } }]
    },
    include: { employee: true }
  });

  if (!user) {
    return response.status(404).json({ message: "No account was found for that email or Login ID" });
  }

  if (user.isEmailVerified) {
    return response.json({ message: "This email is already verified. You can sign in now." });
  }

  const verificationToken = crypto.randomBytes(24).toString("hex");

  await prisma.emailVerificationToken.create({
    data: {
      email: user.email,
      tokenHash: tokenHash(verificationToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });

  return response.json({
    message: "Verification token generated. Use it below to verify your email.",
    email: user.email,
    employeeCode: user.employee?.employeeCode,
    verificationToken,
    verificationExpiresInHours: 24
  });
});

authRouter.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Please fix the highlighted fields", errors: formatZodError(parsed.error) });
  }

  const loginIdOrEmail = parsed.data.loginIdOrEmail.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: loginIdOrEmail }, { employee: { employeeCode: parsed.data.loginIdOrEmail.toUpperCase() } }]
    },
    include: { employee: true }
  });

  if (!user || !user.employee) {
    return response.status(401).json({ message: "Incorrect login ID/email or password" });
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, parsed.data.password);

  if (!isPasswordValid) {
    return response.status(401).json({ message: "Incorrect login ID/email or password" });
  }

  if (!user.isEmailVerified) {
    return response.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before signing in",
      email: user.email,
      employeeCode: user.employee.employeeCode
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      employeeId: user.employee.id,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET ?? "dev-secret",
    { expiresIn: "8h" }
  );

  response.cookie("accessToken", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  });

  return response.json({
    message: "Signed in successfully",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee.id,
      employeeCode: user.employee.employeeCode,
      name: `${user.employee.firstName} ${user.employee.lastName}`,
      phone: user.employee.phone ?? null
    }
  });
});

authRouter.post("/logout", (_request, response) => {
  response.clearCookie("accessToken").json({ message: "Logged out" });
});

authRouter.get("/me", async (request, response) => {
  const token = request.cookies?.accessToken;

  if (!token) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    const session = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? "dev-secret") as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return response.status(401).json({ message: "Authentication required" });
    }

    return response.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee.id,
        employeeCode: user.employee.employeeCode,
        name: `${user.employee.firstName} ${user.employee.lastName}`,
        phone: user.employee.phone ?? null
      }
    });
  } catch {
    return response.status(401).json({ message: "Invalid or expired session" });
  }
});
