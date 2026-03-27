"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, fontFamily: "sans-serif" }}>
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: 32, maxWidth: 500 }}>
          <h2 style={{ color: "white", marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#f87171", fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>{error.message}</p>
          {error.digest && <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Digest: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
