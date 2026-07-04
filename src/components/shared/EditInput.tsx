export function EditInput({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <input
      className="inlineEditInput"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
