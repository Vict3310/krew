import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview: the Krew mark, wordmark and tagline on midnight navy. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#101635",
          padding: "72px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#5b3df5",
            }}
          >
            <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="#ffffff" strokeWidth={2.1} strokeLinecap="round">
              <path d="M5 4v16" />
              <path d="M5 12l14-8" />
              <path d="M5 12l14 8" />
              <circle cx="5" cy="4" r="2.1" fill="#ffffff" stroke="none" />
              <circle cx="5" cy="20" r="2.1" fill="#ffffff" stroke="none" />
              <circle cx="19" cy="4" r="2.1" fill="#ffffff" stroke="none" />
              <circle cx="19" cy="20" r="2.1" fill="#ffffff" stroke="none" />
              <circle cx="5" cy="12" r="2.4" fill="#ffffff" stroke="none" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em" }}>{BRAND.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 900 }}>
            Great events start with the right people.
          </div>
          <div style={{ fontSize: 30, color: "#c3c6e8" }}>{BRAND.tagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
