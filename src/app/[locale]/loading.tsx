export default function Loading() {
  return (
    <div className="container" role="status" aria-label="Loading">
      <div className="skeleton heading" />
      <div className="loading-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton card" key={i} />
        ))}
      </div>
    </div>
  );
}
