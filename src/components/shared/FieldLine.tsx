export function FieldLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="fieldLine">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
