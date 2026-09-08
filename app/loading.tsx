export default function Loading() {
  return (
    <div className="container" style={{ padding: 30 }}>
      <div className="stack">
        <div className="skeleton" style={{ height: 34, width: 220 }} />
        <div className="grid grid-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    </div>
  );
}
