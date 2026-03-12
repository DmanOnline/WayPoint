export default function OfflinePage() {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Waypoint — Offline</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0B0F",
          color: "#F0F2F5",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#888"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Je bent offline
          </h1>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px" }}>
            Deze pagina is niet beschikbaar offline.
          </p>
          <button
            id="back-btn"
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#6C63FF",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Ga terug
          </button>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.querySelector('button').onclick = function() { history.back(); };
                window.addEventListener('online', function() { location.reload(); });
              `,
            }}
          />
        </div>
      </body>
    </html>
  );
}
