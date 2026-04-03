import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as unzipper from "unzipper";

// A4 landscape for wide tables, A4 portrait for text documents
const A4L_W = 842;
const A4L_H = 595;
const A4P_W = 595;
const A4P_H = 842;
const MARGIN = 36;

/**
 * Sanitize text to Latin-1/WinAnsiEncoding so pdf-lib StandardFonts never choke.
 * Spanish characters (á é í ó ú ñ ü Á É Í Ó Ú Ñ ¿ ¡) are all in Latin-1 — pass through.
 */
function sanitize(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, "?");
}

function truncateToWidth(font: PDFFont, text: string, maxWidth: number, fontSize: number): string {
  if (!text) return "";
  let t = text;
  try {
    while (t.length > 1 && font.widthOfTextAtSize(t, fontSize) > maxWidth) {
      t = t.slice(0, -1);
    }
    if (t.length < text.length && t.length > 1) {
      t = t.slice(0, -1) + ".";
    }
  } catch {
    t = text.slice(0, Math.floor(maxWidth / (fontSize * 0.55)));
  }
  return t;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    let fits = false;
    try {
      fits = font.widthOfTextAtSize(candidate, fontSize) <= maxWidth;
    } catch {
      fits = candidate.length * (fontSize * 0.55) <= maxWidth;
    }
    if (fits) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [" "];
}

/**
 * Convert any non-PDF, non-image file to a PDF buffer.
 * Uses pdf-lib (pure JS, Vercel-compatible — no native deps, no headless browser).
 */
export async function anyFileToPdf(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<Buffer> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel", "text/csv"].includes(mimeType) ||
    ["xlsx", "xls", "csv"].includes(ext)
  ) {
    return excelToPdf(buffer, ext === "csv");
  }

  if (
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"].includes(mimeType) ||
    ["docx", "doc"].includes(ext)
  ) {
    return docxToPdf(buffer);
  }

  if (
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint"].includes(mimeType) ||
    ["pptx", "ppt"].includes(ext)
  ) {
    return pptxToPdf(buffer);
  }

  if (mimeType.startsWith("text/") || ["txt", "md"].includes(ext)) {
    return textToPdf(buffer.toString("utf8"));
  }

  throw new Error(`Cannot convert ${mimeType} (.${ext}) to PDF`);
}

async function excelToPdf(buffer: Buffer, isCsv = false): Promise<Buffer> {
  const workbook = isCsv
    ? XLSX.read(buffer.toString("utf8"), { type: "string" })
    : XLSX.read(buffer, { type: "buffer" });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ROW_H = 20;
  const FONT_SZ = 8;
  const HEADER_SZ = 8.5;
  const TITLE_SZ = 11;
  const TITLE_BLOCK = 30;
  const ROWS_PER_PAGE = Math.floor((A4L_H - MARGIN * 2 - TITLE_BLOCK) / ROW_H);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // raw: false → all values as formatted strings (dates, percentages, etc. as displayed)
    const allRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const rows = allRows
      .map((r) => r.map((c) => sanitize(String(c ?? ""))))
      .filter((r) => r.some((c) => c.trim() !== ""));

    if (!rows.length) continue;

    const numCols = Math.max(...rows.map((r) => r.length));
    const contentW = A4L_W - MARGIN * 2;
    // Distribute columns evenly; cap so very narrow cols still get at least 60px
    const colW = Math.max(60, contentW / Math.max(numCols, 1));
    // How many columns actually fit on the page
    const visibleCols = Math.min(numCols, Math.floor(contentW / colW));

    const headerRow = rows[0] ?? [];
    const dataRows = rows.slice(1);

    const pageCount = Math.max(1, Math.ceil(dataRows.length / ROWS_PER_PAGE));
    for (let p = 0; p < pageCount; p++) {
      const page = pdfDoc.addPage([A4L_W, A4L_H]);
      const pageRows = [headerRow, ...dataRows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE)];
      const rowsWidth = visibleCols * colW;

      // Sheet title
      page.drawText(sanitize(`Sheet: ${sheetName}${pageCount > 1 ? ` (page ${p + 1}/${pageCount})` : ""}`), {
        x: MARGIN,
        y: A4L_H - MARGIN - TITLE_SZ,
        font: boldFont,
        size: TITLE_SZ,
        color: rgb(0.1, 0.15, 0.45),
      });

      // Outer border
      page.drawRectangle({
        x: MARGIN,
        y: A4L_H - MARGIN - TITLE_BLOCK - pageRows.length * ROW_H,
        width: rowsWidth,
        height: pageRows.length * ROW_H,
        borderColor: rgb(0.6, 0.7, 0.85),
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      pageRows.forEach((row, rowIdx) => {
        const y = A4L_H - MARGIN - TITLE_BLOCK - rowIdx * ROW_H;
        const isHeader = rowIdx === 0;

        // Row background
        page.drawRectangle({
          x: MARGIN,
          y: y - ROW_H,
          width: rowsWidth,
          height: ROW_H,
          color: isHeader
            ? rgb(0.13, 0.27, 0.65)
            : rowIdx % 2 === 0
            ? rgb(0.95, 0.97, 1)
            : rgb(1, 1, 1),
          borderWidth: 0,
        });

        // Row bottom border
        page.drawLine({
          start: { x: MARGIN, y: y - ROW_H },
          end: { x: MARGIN + rowsWidth, y: y - ROW_H },
          thickness: 0.25,
          color: rgb(0.78, 0.85, 0.94),
        });

        for (let ci = 0; ci < visibleCols; ci++) {
          const x = MARGIN + ci * colW;
          const raw = row[ci] ?? "";
          const f = isHeader ? boldFont : font;
          const sz = isHeader ? HEADER_SZ : FONT_SZ;
          const color = isHeader ? rgb(1, 1, 1) : rgb(0.05, 0.05, 0.15);
          const displayText = truncateToWidth(f, raw, colW - 8, sz);

          if (displayText.trim()) {
            page.drawText(displayText, { x: x + 4, y: y - ROW_H + 6, font: f, size: sz, color });
          }

          // Column divider (skip first)
          if (ci > 0) {
            page.drawLine({
              start: { x, y: y - ROW_H },
              end: { x, y: y + (rowIdx === 0 ? 0 : 0) },
              thickness: 0.2,
              color: rgb(0.78, 0.85, 0.94),
            });
          }
        }
      });
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    const page = pdfDoc.addPage([A4P_W, A4P_H]);
    page.drawText("(empty workbook)", { x: MARGIN, y: A4P_H / 2, font, size: 12 });
  }

  return Buffer.from(await pdfDoc.save());
}

async function docxToPdf(buffer: Buffer): Promise<Buffer> {
  const result = await mammoth.extractRawText({ buffer });
  return textToPdf(result.value);
}

async function pptxToPdf(buffer: Buffer): Promise<Buffer> {
  const directory = await unzipper.Open.buffer(buffer);
  const slideFiles = directory.files
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.path))
    .sort((a, b) => {
      const nA = parseInt(a.path.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const nB = parseInt(b.path.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return nA - nB;
    });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const FONT_SZ = 13;
  const LINE_H = 20;
  const usableW = A4L_W - MARGIN * 2;

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const content = await slideFiles[idx].buffer();
    const xml = content.toString("utf8");
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    const slideText = matches
      .map((m) => m.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(" ");

    const page = pdfDoc.addPage([A4L_W, A4L_H]);

    // Slide badge
    page.drawRectangle({
      x: MARGIN, y: A4L_H - MARGIN - 22,
      width: 80, height: 22,
      color: rgb(0.13, 0.27, 0.65), borderWidth: 0,
    });
    page.drawText(`Slide ${idx + 1}`, {
      x: MARGIN + 6, y: A4L_H - MARGIN - 15,
      font: boldFont, size: 10, color: rgb(1, 1, 1),
    });

    // Slide content
    const lines = wrapText(slideText, font, FONT_SZ, usableW);
    let y = A4L_H - MARGIN - 50;
    for (const line of lines) {
      if (y < MARGIN) break;
      page.drawText(sanitize(line), { x: MARGIN, y, font, size: FONT_SZ, color: rgb(0.1, 0.1, 0.15) });
      y -= LINE_H;
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    const page = pdfDoc.addPage([A4P_W, A4P_H]);
    const f = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("(empty presentation)", { x: MARGIN, y: A4P_H / 2, font: f, size: 12 });
  }

  return Buffer.from(await pdfDoc.save());
}

async function textToPdf(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const FONT_SZ = 10;
  const LINE_H = 15;
  const usableW = A4P_W - MARGIN * 2;
  const usableH = A4P_H - MARGIN * 2;
  const LINES_PER_PAGE = Math.floor(usableH / LINE_H);

  const allLines = text
    .split("\n")
    .flatMap((line) => wrapText(line || " ", font, FONT_SZ, usableW));

  for (let pageStart = 0; pageStart < Math.max(allLines.length, 1); pageStart += LINES_PER_PAGE) {
    const page = pdfDoc.addPage([A4P_W, A4P_H]);
    const pageLines = allLines.slice(pageStart, pageStart + LINES_PER_PAGE);
    pageLines.forEach((line, i) => {
      page.drawText(sanitize(line), {
        x: MARGIN,
        y: A4P_H - MARGIN - i * LINE_H,
        font,
        size: FONT_SZ,
        color: rgb(0.05, 0.05, 0.1),
      });
    });
  }

  return Buffer.from(await pdfDoc.save());
}
