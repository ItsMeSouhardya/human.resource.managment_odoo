# Database Notes

The HRMS is relational by design. Employees, attendance, leave, payroll, documents, and audit logs are connected through strong foreign keys.

## Important Rules

- One user account belongs to one employee profile.
- Email and employee code are unique.
- An employee can have only one attendance record per date.
- Employee users can only read or update permitted parts of their own records.
- Admin/HR users can view all employees and approval queues.
- Payroll values must be non-negative.
- Leave approvals create an audit log and immediately affect leave history.

## Initial Seed

Seed data should include one Admin, one HR user, and one Employee, plus departments, designations, attendance examples, leave balances, and payroll structures.
