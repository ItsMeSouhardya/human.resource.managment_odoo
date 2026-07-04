const base = "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed ${response.status}: ${body.message ?? text}`);
  }
  return { response, body };
}

const login = await request("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ loginIdOrEmail: "admin@company.com", password: "Admin@123" }),
});

const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Login did not return an accessToken cookie");

const authHeaders = { Cookie: cookie };
const me = await request("/auth/me", { headers: authHeaders });
const employees = await request("/employees", { headers: authHeaders });
const attendance = await request("/attendance", { headers: authHeaders });
const leaves = await request("/leave-requests", { headers: authHeaders });
const payroll = await request("/payroll", { headers: authHeaders });
const createEmployee = await request("/employees", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders },
  body: JSON.stringify({
    fullName: `Smoke User ${Date.now()}`,
    email: `smoke-${Date.now()}@company.com`,
    phone: "+91 90000 00999",
    department: "Quality",
    role: "QA Engineer",
    address: "Test Office, Kolkata",
    systemRole: "EMPLOYEE",
  }),
});
const employeesAfterCreate = await request("/employees", { headers: authHeaders });
const invalidLogin = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ loginIdOrEmail: "admin@company.com", password: "wrong-password" }),
});

console.log(JSON.stringify({
  loginUser: login.body.user.email,
  meUser: me.body.user.email,
  employees: employees.body.employees.length,
  attendance: attendance.body.attendanceRecords.length,
  leaves: leaves.body.leaveRequests.length,
  payrollEmployees: Object.keys(payroll.body.payrollByEmployee).length,
  firstEmployeeDocuments: employees.body.employees[0]?.documents?.length ?? 0,
  firstEmployeeLeaveBalances: employees.body.employees[0]?.leaveBalances?.length ?? 0,
  createdEmployee: createEmployee.body.employee.email,
  generatedPasswordReturned: Boolean(createEmployee.body.generatedPassword),
  employeesAfterCreate: employeesAfterCreate.body.employees.length,
  invalidLoginStatus: invalidLogin.status,
}, null, 2));
