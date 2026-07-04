import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type UserRole = "ADMIN" | "HR" | "EMPLOYEE";

export type AuthSession = {
  userId: string;
  employeeId: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      session?: AuthSession;
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.accessToken;

  if (!token) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    request.session = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? "dev-secret") as AuthSession;
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired session" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.session) {
      return response.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(request.session.role)) {
      return response.status(403).json({ message: "You do not have permission to access this resource" });
    }

    return next();
  };
}
