export function StatusLegend() {
  return (
    <div className="statusLegend">
      <span>
        <i className="statusDot green" /> Present
      </span>
      <span>
        <i className="statusDot blue" /> On leave
      </span>
      <span>
        <i className="statusDot yellow" /> Absent
      </span>
    </div>
  );
}
