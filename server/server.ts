import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./modules/auth/routes.js";
import { employeeRouter } from "./modules/employees/routes.js";
import { attendanceRouter } from "./modules/attendance/routes.js";
import { leaveRouter } from "./modules/leaves/routes.js";
import { payrollRouter } from "./modules/payroll/routes.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.use(helmet());
app.use(
  cors({
    origin: process.env.APP_ORIGIN ?? "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "hrms-api" });
});

app.use("/auth", authRouter);
app.use("/employees", employeeRouter);
app.use("/attendance", attendanceRouter);
app.use("/leave-requests", leaveRouter);
app.use("/payroll", payrollRouter);

app.listen(port, () => {
  console.log(`HRMS API listening on http://localhost:${port}`);
});
