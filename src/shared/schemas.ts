import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Company name is required"),
    fullName: z.string().trim().min(3, "Employee name is required"),
    email: emailSchema,
    phone: z.string().trim().min(7, "Phone number is required").max(20, "Phone number is too long"),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["HR", "EMPLOYEE"])
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

export const loginSchema = z.object({
  loginIdOrEmail: z.string().trim().min(1, "Login ID or email is required"),
  password: z.string().min(1, "Password is required")
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  token: z.string().trim().min(8, "Verification token is required")
});

export const employeeProfileUpdateSchema = z.object({
  phone: z.string().trim().min(7).max(20).optional(),
  address: z.string().trim().min(5).max(300).optional(),
  avatarUrl: z.string().url().optional()
});

export const leaveRequestSchema = z
  .object({
    leaveType: z.enum(["PAID", "SICK", "UNPAID"]),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    remarks: z.string().trim().max(500).optional()
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ["endsOn"],
    message: "End date must be on or after start date"
  });

export const payrollUpdateSchema = z.object({
  basicPay: z.number().nonnegative(),
  hra: z.number().nonnegative(),
  allowances: z.number().nonnegative(),
  deductions: z.number().nonnegative()
});
