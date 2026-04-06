import crypto from "crypto";

const SECRET = process.env.PDF_TOKEN_SECRET || process.env.RESEND_API_KEY || "orgrise-pdf-default-secret";

export function generatePdfToken(summaryId: string, orgId: string): string {
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const data = `${summaryId}:${orgId}:${expires}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);
  return Buffer.from(`${data}:${sig}`).toString("base64url");
}

export function verifyPdfToken(token: string, summaryId: string, orgId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;
    const [sid, oid, expiresStr, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || expires < Date.now()) return false;
    if (sid !== summaryId || oid !== orgId) return false;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(`${sid}:${oid}:${expiresStr}`).digest("hex").slice(0, 16);
    return sig === expectedSig;
  } catch {
    return false;
  }
}
