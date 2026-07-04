import { FieldLine } from "../../shared";

export function SecurityTab() {
  return (
    <div className="privateGrid">
      <FieldLine label="Password" value="Last changed today" />
      <FieldLine label="Email Verification" value="Verified" />
      <FieldLine label="Role Access" value="Role based" />
      <FieldLine label="Session" value="Active" />
    </div>
  );
}
