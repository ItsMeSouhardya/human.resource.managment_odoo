# Architecture

## Runtime Flow

```text
React/Vite Web App
  -> REST API over httpOnly auth cookies
Express API
  -> validation, RBAC, service layer
Prisma ORM
  -> SQLite (local file: prisma/dev.db)
```

## Backend Modules

- `auth`: signup, login, logout, email verification, current session
- `employees`: profile details, job details, documents
- `attendance`: check-in, check-out, status views
- `leaves`: employee requests and HR/Admin approvals
- `payroll`: salary structure and employee read-only payroll view
- `audit`: admin-sensitive action trail

## Roles

- `ADMIN`: full control across employees, attendance, leave, and payroll
- `HR`: management and approval workflows
- `EMPLOYEE`: own profile, own attendance, own leave, own payroll view

## API Style

Routes stay thin. Controllers validate input, services enforce business rules, Prisma handles persistence, and middleware enforces authentication/authorization.
