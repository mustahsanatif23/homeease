"use client";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
