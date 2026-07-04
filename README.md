# Human Resource Management System

Every workday, perfectly aligned.

A full-stack HRMS built with React/Vite, Express, SQLite (via Prisma), JWT auth, and Zod validation.

## Stack

- Frontend: React, Vite, TypeScript
- Backend: Node.js, Express, TypeScript
- Database: SQLite (via Prisma ORM)
- Auth: JWT cookies with Argon2 password hashing
- Validation: Zod

## Structure

```text
src/            React frontend source
  shared/       Shared validation schemas and domain types
server/         Express API source
prisma/         Prisma schema, migrations, seed script, dev.db
```

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start both backend (port 4000) and frontend (port 5173) concurrently |
| `npm run dev:backend` | Start Express API only |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run migrations and seed the database |
| `npm run db:seed` | Seed demo data only |
| `npm run build` | Build frontend and compile backend |

## Demo Users

```text
admin@company.com    / Admin@123
hr@company.com       / Hr@12345
employee@company.com / Employee@123
```

## MVP Scope

- Secure signup/signin with role-based access
- Employee and HR/Admin dashboards
- Employee profile management
- Attendance check-in/check-out and daily/weekly/monthly views
- Leave application and approval workflow
- Payroll visibility for employees and salary control for Admin/HR
