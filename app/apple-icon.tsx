import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
        }}
      >
        <span style={{ color: "white", fontSize: 80, fontWeight: 700, letterSpacing: -3 }}>
          OP
        </span>
      </div>
    ),
    { ...size }
  );
}
