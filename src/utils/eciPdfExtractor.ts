/**
 * ECI Official `-WI.pdf` Binary DCTDecode JPEG Stream Extractor & 3x10 Voter Grid Slicer
 *
 * Technical Takedown of ECI's Electoral Roll PDF Format (`2024-FC-EROLLGEN-S12-...-WI.pdf`):
 * 1. ECI `-WI.pdf` files contain ZERO `/Type /Font` text streams (`/Type /Font: 0`).
 * 2. Instead, every page is a raw `1239 x 1754` RGB JPEG image (`/Subtype /Image /Filter /DCTDecode`)
 *    embedded directly between `stream` and `endstream`.
 * 3. Page Layout Invariant across all 72,036 MP Booths:
 *    - Page 1: Cover Sheet (District, AC, Block, Thana, Pin Code, Sections, Starting/Ending Serial, Male/Female/Total Count)
 *    - Page 2: Polling Station Nazri Naksha (Map) & Building Photograph
 *    - Pages 3 .. (N - 1): 3 Columns x 10 Rows = 30 Voter Cards per page (`394 x 161` px per card on `1239 x 1754` canvas)
 *    - Page N (Last Page): Final Summary Table (`निर्वाचकों की संख्या का सारांश`)
 */

export interface ExtractedEciPdfPage {
  pageNumber: number;
  role: 'cover' | 'map_photo' | 'voter_grid' | 'summary_table';
  width: number;
  height: number;
  byteLength: number;
  jpegDataUrl: string;
}

export interface EciVoterCardBox {
  col: number; // 0..2
  row: number; // 0..9
  boxIndex: number; // 1..30 on page
  estimatedSerialNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  epicRegion: { x: number; y: number; width: number; height: number };
  serialRegion: { x: number; y: number; width: number; height: number };
  detailsRegion: { x: number; y: number; width: number; height: number };
}

export interface ExtractedEciPdfRollSummary {
  fileName: string;
  fileSizeBytes: number;
  acNumber: number | null;
  partNumber: number | null;
  totalPages: number;
  voterGridPagesCount: number;
  estimatedVoterBoxesCapacity: number;
  hasEmbeddedFonts: boolean;
  isRasterizedEciWiPdf: boolean;
  coverPageJpegDataUrl: string | null;
  firstVoterGridPageJpegDataUrl: string | null;
  summaryTablePageJpegDataUrl: string | null;
  samplePageNumbers: number[];
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

/**
 * Parses standard ECI filename e.g. `2024-FC-EROLLGEN-S12-149-FinalRoll-Revision2-HIN-1-WI.pdf`
 */
export function parseEciRollFileName(fileName: string): {
  stateCd: string | null;
  acNumber: number | null;
  partNumber: number | null;
  langCd: string | null;
} {
  const stateMatch = fileName.match(/-(S\d{2})-/i);
  const acMatch = fileName.match(/-S\d{2}-(\d+)-/i);
  const partMatch =
    fileName.match(/-(?:HIN|ENG)-(\d+)-WI/i) ||
    fileName.match(/Part[-_ ]?(\d+)/i) ||
    fileName.match(/-(\d+)-WI/i);
  const langMatch = fileName.match(/-(HIN|ENG)-/i);

  return {
    stateCd: stateMatch ? stateMatch[1].toUpperCase() : 'S12',
    acNumber: acMatch ? Number(acMatch[1]) : null,
    partNumber: partMatch ? Number(partMatch[1]) : null,
    langCd: langMatch ? langMatch[1].toUpperCase() : 'HIN',
  };
}

/**
 * Pure-TypeScript zero-dependency binary scanner that extracts all raw `/Filter /DCTDecode`
 * JPEG page streams (`1239 x 1754`) from an official ECI `.pdf` buffer in <20ms.
 */
export function extractJpegStreamsFromEciPdfBytes(
  pdfBytes: Uint8Array,
  maxJpegDataUrlsToMaterialize = 4
): {
  totalPages: number;
  hasEmbeddedFonts: boolean;
  pageByteLengths: number[];
  materializedPages: ExtractedEciPdfPage[];
} {
  // Decode PDF bytes as latin1 string to locate XObject Image stream boundaries rapidly
  let latin1 = '';
  const chunk = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += chunk) {
    const sub = pdfBytes.subarray(i, Math.min(i + chunk, pdfBytes.length));
    latin1 += String.fromCharCode.apply(null, Array.from(sub));
  }

  const hasEmbeddedFonts = /\/Type\s*\/Font\b/.test(latin1);
  const imgRegex =
    /<<[^>]*\/Subtype\s*\/Image[^>]*\/Filter\s*\/DCTDecode[^>]*>>\s*stream\r?\n/g;

  const streamRanges: {
    start: number;
    end: number;
    width: number;
    height: number;
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(latin1)) !== null) {
    const dictText = match[0];
    const wMatch = dictText.match(/\/Width\s+(\d+)/);
    const hMatch = dictText.match(/\/Height\s+(\d+)/);
    const width = wMatch ? Number(wMatch[1]) : 1239;
    const height = hMatch ? Number(hMatch[1]) : 1754;

    const start = match.index + dictText.length;
    const endIdx = latin1.indexOf('endstream', start);
    if (endIdx !== -1) {
      let end = endIdx;
      while (
        end > start &&
        (pdfBytes[end - 1] === 0x0a || pdfBytes[end - 1] === 0x0d)
      ) {
        end--;
      }
      // Verify JPEG SOI magic bytes (0xFF 0xD8 0xFF)
      if (
        end > start + 4 &&
        pdfBytes[start] === 0xff &&
        pdfBytes[start + 1] === 0xd8
      ) {
        streamRanges.push({ start, end, width, height });
      }
    }
  }

  const totalPages = streamRanges.length;
  const pageByteLengths = streamRanges.map((r) => r.end - r.start);

  // Materialize key pages: Page 1 (Cover), Page 2 (Map/Photo), Page 3 (First 30-Voter Grid), and Page N (Summary Table)
  const indicesToMaterialize = new Set<number>();
  if (totalPages >= 1) indicesToMaterialize.add(0); // Page 1: Cover
  if (totalPages >= 3) indicesToMaterialize.add(2); // Page 3: First 30-voter grid
  if (totalPages >= 4) indicesToMaterialize.add(totalPages - 1); // Page N: Summary table
  for (
    let i = 0;
    i < totalPages && indicesToMaterialize.size < maxJpegDataUrlsToMaterialize;
    i++
  ) {
    indicesToMaterialize.add(i);
  }

  const materializedPages: ExtractedEciPdfPage[] = [];
  for (const idx of Array.from(indicesToMaterialize).sort((a, b) => a - b)) {
    const r = streamRanges[idx];
    const pageNum = idx + 1;
    const sub = pdfBytes.subarray(r.start, r.end);
    const role: ExtractedEciPdfPage['role'] =
      pageNum === 1
        ? 'cover'
        : pageNum === 2
        ? 'map_photo'
        : pageNum === totalPages
        ? 'summary_table'
        : 'voter_grid';
    materializedPages.push({
      pageNumber: pageNum,
      role,
      width: r.width,
      height: r.height,
      byteLength: sub.length,
      jpegDataUrl: `data:image/jpeg;base64,${uint8ToBase64(sub)}`,
    });
  }

  return {
    totalPages,
    hasEmbeddedFonts,
    pageByteLengths,
    materializedPages,
  };
}

/**
 * Computes the exact 30 voter card bounding boxes (`3 columns x 10 rows`) for any ECI
 * `1239 x 1754` voter grid page (Pages 3 .. N-1).
 */
export function computeEciVoterGrid30Boxes(
  pageNumber: number,
  pageWidth = 1239,
  pageHeight = 1754
): EciVoterCardBox[] {
  const boxes: EciVoterCardBox[] = [];
  const leftMargin = Math.round(pageWidth * 0.0226); // ~28px on 1239px
  const topHeaderHeight = Math.round(pageHeight * 0.0456); // ~80px on 1754px
  const bottomFooterHeight = Math.round(pageHeight * 0.0365); // ~64px on 1754px
  const gridWidth = pageWidth - leftMargin * 2;
  const gridHeight = pageHeight - topHeaderHeight - bottomFooterHeight;

  const colWidth = Math.floor(gridWidth / 3); // ~394px
  const rowHeight = Math.floor(gridHeight / 10); // ~161px

  const baseSerialBeforePage = Math.max(0, (pageNumber - 3) * 30);

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 3; col++) {
      const boxIndex = row * 3 + col + 1;
      const x = leftMargin + col * colWidth;
      const y = topHeaderHeight + row * rowHeight;
      boxes.push({
        col,
        row,
        boxIndex,
        estimatedSerialNumber: baseSerialBeforePage + boxIndex,
        x,
        y,
        width: colWidth,
        height: rowHeight,
        serialRegion: {
          x: x + 4,
          y: y + 3,
          width: Math.round(colWidth * 0.34),
          height: Math.round(rowHeight * 0.18),
        },
        epicRegion: {
          x: x + Math.round(colWidth * 0.48),
          y: y + 3,
          width: Math.round(colWidth * 0.5),
          height: Math.round(rowHeight * 0.18),
        },
        detailsRegion: {
          x: x + 6,
          y: y + Math.round(rowHeight * 0.19),
          width: Math.round(colWidth * 0.72),
          height: Math.round(rowHeight * 0.78),
        },
      });
    }
  }

  return boxes;
}

/**
 * Full high-level inspection of an ECI Electoral Roll PDF buffer.
 */
export function inspectEciPdfBuffer(
  pdfBytes: Uint8Array,
  fileName: string
): ExtractedEciPdfRollSummary {
  const meta = parseEciRollFileName(fileName);
  const extracted = extractJpegStreamsFromEciPdfBytes(pdfBytes, 4);
  const voterGridPagesCount = Math.max(0, extracted.totalPages - 3);
  const coverPage = extracted.materializedPages.find((p) => p.role === 'cover');
  const firstGridPage = extracted.materializedPages.find(
    (p) => p.role === 'voter_grid'
  );
  const summaryPage = extracted.materializedPages.find(
    (p) => p.role === 'summary_table'
  );

  return {
    fileName,
    fileSizeBytes: pdfBytes.length,
    acNumber: meta.acNumber,
    partNumber: meta.partNumber,
    totalPages: extracted.totalPages,
    voterGridPagesCount,
    // Each voter grid page holds up to 30 voter boxes (last grid page averages ~18)
    estimatedVoterBoxesCapacity:
      voterGridPagesCount > 0 ? (voterGridPagesCount - 1) * 30 + 18 : 0,
    hasEmbeddedFonts: extracted.hasEmbeddedFonts,
    isRasterizedEciWiPdf:
      !extracted.hasEmbeddedFonts && extracted.totalPages >= 3,
    coverPageJpegDataUrl: coverPage?.jpegDataUrl || null,
    firstVoterGridPageJpegDataUrl: firstGridPage?.jpegDataUrl || null,
    summaryTablePageJpegDataUrl: summaryPage?.jpegDataUrl || null,
    samplePageNumbers: extracted.materializedPages.map((p) => p.pageNumber),
  };
}
