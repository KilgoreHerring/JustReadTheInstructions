export default function HorizonScanningPage() {
  return (
    <div className="prose-column">
      <h1 className="text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
        Horizon Scanning
      </h1>

      <div className="border border-[var(--border)] rounded-lg p-12 text-center">
        <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          Coming Soon
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Horizon scanning will monitor regulatory bodies for changes to tracked
          regulations and alert you when obligations are added, amended, or
          removed. This feature will integrate with the legislation.gov.uk API and
          FCA publications feed.
        </p>
      </div>
    </div>
  );
}
