import { useState } from "react";
import { FieldLine } from "../../shared";
import type { PayrollStructure } from "../../../shared/types";

type SalaryInfoTabProps = {
  employeeId: string;
  isAdmin: boolean;
  payroll: PayrollStructure;
  setPayrollByEmployee: React.Dispatch<React.SetStateAction<Record<string, PayrollStructure>>>;
};

function NumberEdit({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="numberEdit">
      <span>{label}</span>
      <input type="number" value={value} min="0" onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function SalaryInfoTab({ employeeId, isAdmin, payroll, setPayrollByEmployee }: SalaryInfoTabProps) {
  const [error, setError] = useState("");
  const basic = payroll.monthlyWage * 0.5;
  const hra = basic * 0.5;
  const standard = payroll.monthlyWage * 0.08334;
  const performance = payroll.monthlyWage * 0.04165;
  const lta = payroll.monthlyWage * 0.04165;
  const fixed = Math.max(payroll.monthlyWage - (basic + hra + standard + performance + lta), 0);
  const pf = basic * (payroll.pfRate / 100);
  const gross = basic + hra + standard + performance + lta + fixed;
  const net = gross - pf - payroll.professionalTax;
  const components: [string, number, string][] = [
    ["Basic Salary", basic, "50.00%"],
    ["House Rent Allowance", hra, "50.00% of basic"],
    ["Standard Allowance", standard, "8.33%"],
    ["Performance Bonus", performance, "4.165%"],
    ["Leave Travel Allowance", lta, "4.165%"],
    ["Fixed Allowance", fixed, "Auto balance"],
  ];

  async function persistPayroll(nextPayroll: PayrollStructure) {
    setError("");
    const response = await fetch(`/payroll/${employeeId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextPayroll),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not update payroll");
      return;
    }

    setPayrollByEmployee((records) => ({ ...records, [employeeId]: payload.payroll }));
  }

  function updatePayroll(key: keyof PayrollStructure, value: number) {
    const nextPayroll = { ...payroll, [key]: Number.isFinite(value) ? value : 0 };
    setPayrollByEmployee((records) => ({
      ...records,
      [employeeId]: nextPayroll,
    }));
    persistPayroll(nextPayroll);
  }

  return (
    <div className="salaryTab">
      <div className="salaryHeader">
        {isAdmin ? (
          <>
            <NumberEdit label="Month Wage" value={payroll.monthlyWage} onChange={(v) => updatePayroll("monthlyWage", v)} />
            <NumberEdit label="Working days/week" value={payroll.workingDaysPerWeek} onChange={(v) => updatePayroll("workingDaysPerWeek", v)} />
            <NumberEdit label="Break Time (hrs)" value={payroll.breakTimeHours} onChange={(v) => updatePayroll("breakTimeHours", v)} />
            <NumberEdit label="PF Rate (%)" value={payroll.pfRate} onChange={(v) => updatePayroll("pfRate", v)} />
            <NumberEdit label="Professional Tax" value={payroll.professionalTax} onChange={(v) => updatePayroll("professionalTax", v)} />
          </>
        ) : (
          <>
            <FieldLine label="Month Wage" value={`${payroll.monthlyWage.toFixed(0)} / Month`} />
            <FieldLine label="Yearly wage" value={`${(payroll.monthlyWage * 12).toFixed(0)} / Yearly`} />
            <FieldLine label="No of working days in a week" value={`${payroll.workingDaysPerWeek * 8} hrs`} />
            <FieldLine label="Break Time" value={`${payroll.breakTimeHours} hr`} />
          </>
        )}
        {error ? <p className="fieldError">{error}</p> : null}
      </div>
      <section>
        <h3>Salary Components</h3>
        {components.map(([label, amount, percent]) => (
          <div className="salaryLine" key={label}>
            <span>{label}</span>
            <strong>{Number(amount).toFixed(2)} / month</strong>
            <em>{percent}</em>
          </div>
        ))}
      </section>
      <section>
        <h3>Provident Fund (PF) Contribution</h3>
        <FieldLine label="Employee" value={`${pf.toFixed(2)} / month - ${payroll.pfRate.toFixed(2)}%`} />
        <FieldLine label="Employer" value={`${pf.toFixed(2)} / month - ${payroll.pfRate.toFixed(2)}%`} />
        <h3>Tax Deductions</h3>
        <FieldLine label="Professional Tax" value={`${payroll.professionalTax.toFixed(2)} / month`} />
        <h3>Payroll Accuracy</h3>
        <FieldLine label="Gross Pay" value={`${gross.toFixed(2)} / month`} />
        <FieldLine label="Net Pay" value={`${net.toFixed(2)} / month`} />
      </section>
    </div>
  );
}
