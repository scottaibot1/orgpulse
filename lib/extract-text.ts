async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  const data = new Uint8Array(buffer);
  const pdf = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str ?? "")
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n").trim();
}
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as unzipper from "unzipper";

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    return extractPdfText(buffer);
  }

  // DOCX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // DOC (older Word)
  if (mimeType === "application/msword" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // XLSX / XLS
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) lines.push(`Sheet: ${sheetName}\n${csv}`);
    });
    return lines.join("\n\n").trim();
  }

  // PPTX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    return extractPptxText(buffer);
  }

  // PPT (older PowerPoint — fallback to basic extraction)
  if (mimeType === "application/vnd.ms-powerpoint" || ext === "ppt") {
    // PPT binary is hard to parse without native libs; return best-effort
    return buffer.toString("utf8").replace(/[^\x20-\x7E\n]/g, " ").replace(/\s{3,}/g, "\n").trim();
  }

  // Plain text / markdown
  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") {
    return buffer.toString("utf8").trim();
  }

  throw new Error(`Unsupported file type: ${mimeType} (.${ext})`);
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const texts: string[] = [];
  const directory = await unzipper.Open.buffer(buffer);

  for (const entry of directory.files) {
    if (entry.path.match(/^ppt\/slides\/slide\d+\.xml$/)) {
      const content = await entry.buffer();
      const xml = content.toString("utf8");
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
      const slideText = matches
        .map((m: string) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ");
      if (slideText) texts.push(slideText);
    }
  }

  return texts.join("\n").trim();
}
