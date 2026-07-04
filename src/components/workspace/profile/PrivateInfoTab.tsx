import { FieldLine } from "../../shared";
import type { EmployeeCard } from "../../../shared/types";

type PrivateInfoTabProps = {
  employeeCode: string;
  activeEmployee: EmployeeCard;
};

export function PrivateInfoTab({ employeeCode, activeEmployee }: PrivateInfoTabProps) {
  return (
    <div className="privateGrid">
      <FieldLine label="Date of Birth" value="12 Apr 1998" />
      <FieldLine label="Bank Details" value="Verified" />
      <FieldLine label="Residing Address" value={activeEmployee.address} />
      <FieldLine label="Account Number" value="XXXX-9021" />
      <FieldLine label="Nationality" value="Indian" />
      <FieldLine label="Bank Name" value="HDFC Bank" />
      <FieldLine label="Personal Email" value={activeEmployee.email} />
      <FieldLine label="IFSC Code" value="HDFC0001234" />
      <FieldLine label="Gender" value="Not specified" />
      <FieldLine label="PAN No" value="ABCDE1234F" />
      <FieldLine label="Marital Status" value="Single" />
      <FieldLine label="UAN NO" value="100200300400" />
      <FieldLine label="Date of Joining" value="01 Jan 2026" />
      <FieldLine label="Emp Code" value={employeeCode} />
    </div>
  );
}
