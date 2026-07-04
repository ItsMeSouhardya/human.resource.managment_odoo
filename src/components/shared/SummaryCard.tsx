export function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <article>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
