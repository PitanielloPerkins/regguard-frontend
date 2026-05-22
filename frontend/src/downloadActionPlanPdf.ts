/**
 * Expert Brain: Contractor Action Plan → printable Reg Guard punch list PDF (jsPDF).
 *
 * Typography: jsPDF ships with Helvetica/Times/Courier only. We use **Helvetica** as the embedded
 * professional sans-serif (metrically similar to Inter/Roboto) so the PDF stays lightweight without TTF.
 */
import { jsPDF } from "jspdf";

import { backendUrl } from "./env";
import { fetchWithTimeout } from "./fetchWithTimeout";

/** Standard PDF sans — aligns with Inter/Roboto styling intent. */
const PDF_SANS = "helvetica";

/** Reg Guard “construction navy” — matches index.css */
const RG_NAVY: [number, number, number] = [13, 27, 42];
const RG_LINK: [number, number, number] = [168, 197, 232];
const RG_BODY_TEXT: [number, number, number] = [33, 38, 48];

/** Long-form date inserted into the PDF footer (e.g. "May 2, 2026"). */
function pdfAsOfDateString(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildPdfFooterDisclaimer(asOfDate: string): string {
  return (
    `DISCLAIMER: This report is an AI-assisted compliance aid based on available digital records as of ${asOfDate}. ` +
    "It is provided for informational purposes only. Final verification of all fees, codes, and technical requirements must be performed with the local Authority Having Jurisdiction (AHJ) by a licensed professional."
  );
}

function stripInlineMd(line: string): string {
  let s = line;
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 — $2");
  return s;
}

function slugDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Strip internal fallback / API error / dev-only prose so it never lands in client PDFs. */
function shouldDropPdfLine(line: string): boolean {
  const t = line.trim();
  if (!t) {
    return false;
  }
  const lower = t.toLowerCase();
  if (/workflow\s*trace/i.test(t)) {
    return true;
  }
  if (/generated\s+without\s+claude/i.test(lower)) {
    return true;
  }
  if (/enable\s+anthropic_api_key/i.test(lower)) {
    return true;
  }
  if (lower.includes("anthropic_api_key") && (lower.includes("enable") || lower.includes("set "))) {
    return true;
  }
  if (/\bapi\s+error\b/i.test(t)) {
    return true;
  }
  if (lower.includes("api error")) {
    return true;
  }
  if (lower.includes("structured fallback")) {
    return true;
  }
  if (lower.includes("claude research memo failed")) {
    return true;
  }
  if (lower.includes("claude action plan unavailable")) {
    return true;
  }
  if (/\btdcj\b/i.test(t)) {
    return true;
  }
  if (
    /\bhumble\b/i.test(t) &&
    (/cityofhumble|humbletx|humble-tx|humble\s*,\s*tx|\.gov\/[^)\s]*humble|humble[^)\s]*\.gov/i.test(lower) ||
      /^-\s*https?:\/\/[^\s]*humble/i.test(t))
  ) {
    return true;
  }
  return lower.includes("failed: error code");
}

/** Remove the backend **Workflow trace** block (bullets often omit the trigger phrase). */
function stripWorkflowTraceSection(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let skip = false;
  for (const line of lines) {
    const trim = line.trim();
    if (!skip && /workflow\s*trace/i.test(line)) {
      skip = true;
      continue;
    }
    if (skip) {
      if (trim === "---" || /^#{1,6}\s/.test(trim)) {
        skip = false;
        if (trim !== "---") {
          out.push(line);
        }
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function isPlanoTexas(options: { city?: string | null; siteAddress?: string | null }): boolean {
  if ((options.city || "").trim().toLowerCase() === "plano") {
    return true;
  }
  const addr = (options.siteAddress || "").toLowerCase();
  return /\bplano\b/.test(addr) && /\b(tx|texas)\b/.test(addr);
}

function isDallasTexas(options: { city?: string | null; siteAddress?: string | null }): boolean {
  if ((options.city || "").trim().toLowerCase() === "dallas") {
    return true;
  }
  const addr = (options.siteAddress || "").toLowerCase();
  return /\bdallas\b/.test(addr) && /\b(tx|texas)\b/.test(addr);
}

/** Hard-coded field sync — keep in lockstep with ``backend/research_memo.py``. */
const REG_GUARD_PLANO_PERMIT_TOTAL_USD = "75.00";
const REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD = "167.00";

/** Plano Building Inspection — synced total for PDF Permit Costs (base + laborer). */
const PLANO_ELECTRICAL_PERMIT_PDF_LINES = [
  "### Permit Costs",
  "",
  `- [ ] **Electrical permit (Plano, TX — Reg Guard fee sync):** **$${REG_GUARD_PLANO_PERMIT_TOTAL_USD}** total — **$65.00** base permit + **$10.00** laborer fee. Confirm on the official City of Plano fee schedule before posting fees.`,
  `- [ ] **Plano Ord. 250.50 (Reg Guard sync):** Two **8 ft** grounding rods **20 ft** apart **connected by 2/0 AWG** between rods (**not** 6 ft NEC-spacing narrative); verify on official Plano / Municode.`,
  "",
].join("\n");

const DALLAS_TRADE_PERMIT_PDF_LINES = [
  "### Permit Costs",
  "",
  `- [ ] **Trade permit (Dallas, TX — Reg Guard fee sync):** **$${REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD}** minimum total including **administrative fees** (confirm on official Dallas permit / fee pages).`,
  "",
].join("\n");

/**
 * First line of live Universal Scout blocks: Jurisdiction → Permits → Codes (see App.tsx headings).
 * PDF body starts here so preamble / error banners / narrative titles are omitted.
 */
function findFirstTechnicalSectionIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.startsWith("###")) {
      continue;
    }
    const afterHashes = t.replace(/^#+\s*/, "").toLowerCase();
    if (
      afterHashes.startsWith("jurisdiction") ||
      afterHashes.startsWith("building permits") ||
      afterHashes.startsWith("building codes")
    ) {
      return i;
    }
  }
  return -1;
}

function markdownForPdfBody(raw: string): string {
  let text = stripWorkflowTraceSection(raw);
  const lines = text.split(/\r?\n/).filter((ln) => !shouldDropPdfLine(ln));
  const start = findFirstTechnicalSectionIndex(lines);
  const bodyLines = start >= 0 ? lines.slice(start) : lines;
  return bodyLines.join("\n").trim();
}

/** JSON from ``GET /permit-draft-calculations`` — mirrors ``backend/calculations.py``. */
export type PermitDraftCalculations = {
  scope: string;
  nec_edition_note: string;
  article_220: {
    line_items: Array<{ description: string; va: number; ref: string }>;
    total_calculated_va: number;
    feeder_amps_at_240v: number;
    main_breaker_frame_a: number;
    calculation_notes: string[];
  };
  article_310: {
    conductor_material: string;
    insulation_assumption: string;
    minimum_ampacity_target_a: number;
    main_breaker_frame_a: number;
    selected_conductor_display: string;
    tabular_ampacity_a: number;
    table_ref: string;
    ocpd_notes?: string[];
    notes: string;
  };
  disclaimer: string;
};

/** Minimal vision overlay input (matches ``VisualAuditPayload`` without importing App). */
export type PermitVisionOverlay = {
  detections?: Array<{
    label: string;
    box_2d: [number, number, number, number];
    status?: string;
  }>;
} | null;

export async function fetchPermitDraftCalculations(jobDescription: string): Promise<PermitDraftCalculations> {
  const q = new URLSearchParams();
  if (jobDescription.trim()) {
    q.set("job_description", jobDescription.trim());
  }
  const res = await fetchWithTimeout(`${backendUrl("/permit-draft-calculations")}?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t.trim() || `Permit calculations failed (HTTP ${res.status}).`);
  }
  return (await res.json()) as PermitDraftCalculations;
}

/** Rasterize the uploaded photo with Vision Agent boxes for PDF embedding. */
export async function renderAnnotatedSitePhotoDataUrl(
  photoObjectUrl: string | null,
  vision: PermitVisionOverlay,
): Promise<string | null> {
  if (!photoObjectUrl) {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dets = vision?.detections;
        if (dets?.length) {
          const lw = Math.max(2, Math.round(w / 380));
          for (const det of dets) {
            const [ymin, xmin, ymax, xmax] = det.box_2d;
            const sx = (xmin / 1000) * w;
            const sy = (ymin / 1000) * h;
            const sw = ((xmax - xmin) / 1000) * w;
            const sh = ((ymax - ymin) / 1000) * h;
            ctx.strokeStyle =
              det.status === "violation" ? "#dc2626" : det.status === "ok" ? "#16a34a" : "#ca8a04";
            ctx.lineWidth = lw;
            ctx.strokeRect(sx, sy, sw, sh);
            const fs = Math.max(13, Math.round(w / 52));
            ctx.font = `600 ${fs}px Helvetica, Arial, sans-serif`;
            ctx.fillStyle = "rgba(248,250,252,0.95)";
            ctx.strokeStyle = "rgba(15,23,42,0.85)";
            ctx.lineWidth = Math.ceil(lw * 0.9);
            const ly = sy + fs + 4;
            ctx.strokeText(det.label, sx + 4, ly);
            ctx.fillText(det.label, sx + 4, ly);
          }
        }
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = photoObjectUrl;
  });
}

export async function downloadPermitPackagePdf(options: {
  markdown: string;
  siteAddress?: string | null;
  zip?: string | null;
  city?: string | null;
  county?: string | null;
  jobDescription: string;
  visualAudit: PermitVisionOverlay;
  photoObjectUrl: string | null;
  ahjLabel: string | null;
}): Promise<void> {
  const [calculations, annotatedPhotoDataUrl] = await Promise.all([
    fetchPermitDraftCalculations(options.jobDescription),
    renderAnnotatedSitePhotoDataUrl(options.photoObjectUrl, options.visualAudit),
  ]);
  downloadActionPlanPdf({
    markdown: options.markdown,
    siteAddress: options.siteAddress,
    zip: options.zip,
    city: options.city,
    county: options.county,
    permitPackage: {
      calculations,
      annotatedPhotoDataUrl,
      ahjLabel: options.ahjLabel,
    },
  });
}

export function downloadActionPlanPdf(options: {
  markdown: string;
  siteAddress?: string | null;
  zip?: string | null;
  city?: string | null;
  county?: string | null;
  permitPackage?: {
    calculations: PermitDraftCalculations;
    annotatedPhotoDataUrl: string | null;
    ahjLabel: string | null;
  };
}): void {
  let trimmed = markdownForPdfBody(options.markdown);
  if (isDallasTexas(options)) {
    trimmed = `${DALLAS_TRADE_PERMIT_PDF_LINES}\n${trimmed}`.trim();
  }
  if (isPlanoTexas(options)) {
    trimmed = `${PLANO_ELECTRICAL_PERMIT_PDF_LINES}\n${trimmed}`.trim();
  }
  if (!trimmed) {
    return;
  }

  const permitPkg = options.permitPackage;

  const pdf = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const innerW = pageW - 2 * margin;

  const footerDisclaimerBody = buildPdfFooterDisclaimer(pdfAsOfDateString());
  pdf.setFont(PDF_SANS, "normal");
  pdf.setFontSize(6.5);
  const footerWrapLines = pdf.splitTextToSize(footerDisclaimerBody, innerW);
  const footerLineH = 3.0;
  /** Space reserved at bottom of every page for disclaimer + page line */
  const footerReserve = Math.max(26, footerWrapLines.length * footerLineH + 10);
  const disclaimerMinReserve = footerReserve + 6;

  let y = 0;

  const drawFirstPageHeader = () => {
    const markX = margin;
    const markY = 7.5;
    const textX = margin + 16;
    const titleMaxW = innerW - 16;

    const locBits: string[] = [];
    if (options.siteAddress?.trim()) {
      locBits.push(options.siteAddress.trim());
    } else if (options.city?.trim() || options.zip?.trim()) {
      if (options.city?.trim()) {
        locBits.push(options.city.trim());
      }
      if (options.zip?.trim()) {
        locBits.push(`ZIP ${options.zip.trim()}`);
      }
    }
    const loc = locBits.join(" · ");

    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(14);
    const reportTitle = "RegGuard Professional Compliance Report";
    const titleLines = pdf.splitTextToSize(reportTitle, titleMaxW);
    let ty = 13;
    ty += titleLines.length * 5.2;
    ty += 1.5 + 5.5;
    if (loc) {
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(10);
      const locLinesMeasure = pdf.splitTextToSize(loc.slice(0, 280), titleMaxW);
      ty += 4.5 + locLinesMeasure.length * 4.35;
    }
    const headerBandMm = Math.max(44, ty + 8);

    pdf.setFillColor(...RG_NAVY);
    pdf.rect(0, 0, pageW, headerBandMm, "F");

    pdf.setFillColor(...RG_LINK);
    pdf.roundedRect(markX, markY, 12, 12, 2.2, 2.2, "F");
    pdf.setTextColor(...RG_NAVY);
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(8.2);
    pdf.text("RG", markX + 2.6, markY + 8.2);

    pdf.setTextColor(224, 225, 221);
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(14);
    let titleY = 13;
    for (const ln of titleLines) {
      pdf.text(ln, textX, titleY);
      titleY += 5.2;
    }

    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(8.8);
    pdf.setTextColor(...RG_LINK);
    pdf.text("Agentic compliance assistant for contractors", textX, titleY + 1.5);

    if (loc) {
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(235, 237, 242);
      pdf.text("Project address", textX, titleY + 8.5);
      pdf.setFontSize(10.2);
      pdf.setTextColor(255, 255, 255);
      const locLines = pdf.splitTextToSize(loc.slice(0, 280), titleMaxW);
      let ly = titleY + 13;
      for (const ln of locLines) {
        pdf.text(ln, textX, ly);
        ly += 4.35;
      }
    }

    pdf.setDrawColor(...RG_LINK);
    pdf.setLineWidth(0.35);
    pdf.line(margin, headerBandMm - 2.5, pageW - margin, headerBandMm - 2.5);

    pdf.setTextColor(...RG_BODY_TEXT);
    y = headerBandMm + 6;
  };

  const startContinuedPage = () => {
    pdf.addPage();
    pdf.setDrawColor(190, 195, 205);
    pdf.setLineWidth(0.25);
    pdf.line(margin, 14, pageW - margin, 14);
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...RG_NAVY);
    pdf.text("RegGuard Professional Compliance Report (continued)", margin, 21);
    pdf.setFont(PDF_SANS, "normal");
    pdf.setTextColor(...RG_BODY_TEXT);
    y = 28;
  };

  const checkBreak = (nextBlockMm: number) => {
    if (y + nextBlockMm > pageH - footerReserve - disclaimerMinReserve) {
      startContinuedPage();
    }
  };

  drawFirstPageHeader();

  /* ----- PROJECT SUMMARY (two columns) ----- */
  const summaryColGap = 5;
  const sumColW = (innerW - summaryColGap) / 2;
  const sumX0 = margin;
  const sumX1 = margin + sumColW + summaryColGap;
  const stampShort = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const projAddr = (options.siteAddress || "").trim() || "—";
  const projZip = (options.zip || "").trim() || "—";
  const projCity = (options.city || "").trim();
  const projCounty = (options.county || "").trim();
  const localityLabel = projCity
    ? projCounty
      ? `${projCity} · ${projCounty}`
      : projCity
    : projCounty || "—";

  checkBreak(36);
  pdf.setFont(PDF_SANS, "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...RG_NAVY);
  pdf.text("PROJECT SUMMARY", margin, y);
  y += 7;

  let yLeft = y;
  let yRight = y;

  pdf.setFont(PDF_SANS, "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(55, 65, 80);
  pdf.text("Project address", sumX0, yLeft);
  yLeft += 4.2;
  pdf.setFont(PDF_SANS, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...RG_BODY_TEXT);
  for (const ln of pdf.splitTextToSize(projAddr, sumColW)) {
    pdf.text(ln, sumX0, yLeft);
    yLeft += 4.15;
  }
  yLeft += 2;
  pdf.setFont(PDF_SANS, "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(55, 65, 80);
  pdf.text("ZIP", sumX0, yLeft);
  yLeft += 4.2;
  pdf.setFont(PDF_SANS, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...RG_BODY_TEXT);
  pdf.text(projZip, sumX0, yLeft);
  yLeft += 6;

  pdf.setFont(PDF_SANS, "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(55, 65, 80);
  pdf.text("City / county", sumX1, yRight);
  yRight += 4.2;
  pdf.setFont(PDF_SANS, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...RG_BODY_TEXT);
  for (const ln of pdf.splitTextToSize(localityLabel, sumColW)) {
    pdf.text(ln, sumX1, yRight);
    yRight += 4.15;
  }
  yRight += 2;
  pdf.setFont(PDF_SANS, "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(55, 65, 80);
  pdf.text("Report generated", sumX1, yRight);
  yRight += 4.2;
  pdf.setFont(PDF_SANS, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...RG_BODY_TEXT);
  pdf.text(stampShort, sumX1, yRight);
  yRight += 6;

  y = Math.max(yLeft, yRight) + 3;
  pdf.setDrawColor(210, 215, 222);
  pdf.setLineWidth(0.25);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  /* ----- PERMIT SUBMITTAL PACKAGE (Autonomous Permit Draftsman) ----- */
  if (permitPkg) {
    const a220 = permitPkg.calculations.article_220;
    const a310 = permitPkg.calculations.article_310;
    checkBreak(52);
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...RG_NAVY);
    pdf.text("PERMIT SUBMITTAL PACKAGE", margin, y);
    y += 7;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(8.4);
    pdf.setTextColor(...RG_BODY_TEXT);
    const pkgIntro = pdf.splitTextToSize(
      `${permitPkg.calculations.nec_edition_note} Load schedule follows NEC Article 220-style dwelling assumptions for a 200 A upgrade; conductor excerpt Article 310.`,
      innerW,
    );
    for (const ln of pkgIntro) {
      pdf.text(ln, margin, y);
      y += 4.05;
    }
    y += 2;
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(9.8);
    pdf.setTextColor(...RG_NAVY);
    pdf.text("Article 220 — Calculated load", margin, y);
    y += 5.2;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(8.8);
    pdf.text(`Total calculated VA: ${a220.total_calculated_va.toLocaleString()} VA`, margin, y);
    y += 4.4;
    pdf.text(
      `Calculated feeder demand @ 240 V: ${a220.feeder_amps_at_240v} A  |  Planning main frame: ${a220.main_breaker_frame_a} A`,
      margin,
      y,
    );
    y += 5.5;
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(9.8);
    pdf.text("Article 310 — Required conductor (copper)", margin, y);
    y += 5.2;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(8.8);
    pdf.text(`${a310.selected_conductor_display} — ${a310.table_ref}`, margin, y);
    y += 4.4;
    pdf.text(`Tabulated ampacity (75 deg C column reference): ${a310.tabular_ampacity_a} A`, margin, y);
    y += 4.8;
    if (a310.ocpd_notes?.length) {
      pdf.setFontSize(7.9);
      pdf.setTextColor(90, 95, 105);
      for (const note of a310.ocpd_notes) {
        for (const ln of pdf.splitTextToSize(note, innerW)) {
          pdf.text(ln, margin, y);
          y += 3.85;
        }
      }
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 2;
    }

    if (permitPkg.annotatedPhotoDataUrl) {
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(9.3);
      pdf.setTextColor(...RG_NAVY);
      pdf.text("Annotated site photo (Vision Agent)", margin, y);
      y += 5.5;
      pdf.setFont(PDF_SANS, "normal");
      pdf.setFontSize(8.8);
      pdf.setTextColor(...RG_BODY_TEXT);
      try {
        const url = permitPkg.annotatedPhotoDataUrl;
        const props = pdf.getImageProperties(url);
        const imgWmm = innerW;
        const imgHmm = (props.height / props.width) * imgWmm;
        checkBreak(Math.min(imgHmm + 8, 115));
        pdf.addImage(url, "JPEG", margin, y, imgWmm, imgHmm);
        y += imgHmm + 6;
      } catch {
        pdf.setFont(PDF_SANS, "italic");
        pdf.setFontSize(8);
        pdf.text("(Annotated photo could not be embedded in this PDF.)", margin, y);
        y += 5;
        pdf.setFont(PDF_SANS, "normal");
      }
    }

    pdf.setDrawColor(210, 215, 222);
    pdf.setLineWidth(0.25);
    pdf.line(margin, y, pageW - margin, y);
    y += 6;
  }

  /* ----- Body: balanced two columns for readability (headings full width) ----- */
  const bodyColGap = 5;
  const bodyColW = (innerW - bodyColGap) / 2;
  const bodyX0 = margin;
  const bodyX1 = margin + bodyColW + bodyColGap;
  let yCol0 = y;
  let yCol1 = y;

  const contentBottomY = () => pageH - footerReserve - disclaimerMinReserve;

  const syncBodyY = () => {
    y = Math.max(yCol0, yCol1);
  };

  const bodyNewPage = () => {
    startContinuedPage();
    yCol0 = y;
    yCol1 = y;
  };

  const fullWidthEnsure = (needMm: number) => {
    syncBodyY();
    if (y + needMm > contentBottomY()) {
      bodyNewPage();
    }
  };

  const emitBodyLineBalanced = (ln: string, lineHeight: number) => {
    let col: 0 | 1 = yCol0 <= yCol1 ? 0 : 1;
    let cy = col === 0 ? yCol0 : yCol1;
    if (cy + lineHeight > contentBottomY()) {
      const alt: 0 | 1 = col === 0 ? 1 : 0;
      const ay = alt === 0 ? yCol0 : yCol1;
      if (ay + lineHeight <= contentBottomY()) {
        col = alt;
        cy = ay;
      } else {
        bodyNewPage();
        col = 0;
        cy = yCol0;
      }
    }
    const x = col === 0 ? bodyX0 : bodyX1;
    pdf.text(ln, x, cy);
    if (col === 0) {
      yCol0 = cy + lineHeight;
    } else {
      yCol1 = cy + lineHeight;
    }
  };

  const rawLines = trimmed.split(/\r?\n/);
  for (const raw of rawLines) {
    const line = raw.trimEnd();
    const t = line.trim();

    if (t === "---" || t === "***") {
      fullWidthEnsure(10);
      syncBodyY();
      y += 2;
      pdf.setDrawColor(210, 215, 222);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageW - margin, y);
      y += 5;
      yCol0 = yCol1 = y;
      continue;
    }

    if (!t) {
      const g = 2.8;
      yCol0 += g;
      yCol1 += g;
      syncBodyY();
      continue;
    }

    if (t.startsWith("# ") && !t.startsWith("##")) {
      fullWidthEnsure(10);
      syncBodyY();
      y = Math.max(yCol0, yCol1);
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(...RG_NAVY);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(2)), innerW);
      for (const ln of lines2) {
        if (y + 7 > contentBottomY()) {
          bodyNewPage();
          y = Math.max(yCol0, yCol1);
        }
        pdf.text(ln, margin, y);
        y += 7;
      }
      pdf.setFont(PDF_SANS, "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1.2;
      yCol0 = yCol1 = y;
      continue;
    }

    if (t.startsWith("## ") && !t.startsWith("###")) {
      fullWidthEnsure(8);
      syncBodyY();
      y = Math.max(yCol0, yCol1);
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(12.5);
      pdf.setTextColor(...RG_NAVY);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(3)), innerW);
      for (const ln of lines2) {
        if (y + 5.8 > contentBottomY()) {
          bodyNewPage();
          y = Math.max(yCol0, yCol1);
        }
        pdf.text(ln, margin, y);
        y += 5.8;
      }
      pdf.setFont(PDF_SANS, "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1.5;
      yCol0 = yCol1 = y;
      continue;
    }

    if (t.startsWith("### ")) {
      fullWidthEnsure(7);
      syncBodyY();
      y = Math.max(yCol0, yCol1);
      pdf.setFont(PDF_SANS, "bold");
      pdf.setFontSize(10.6);
      pdf.setTextColor(55, 65, 80);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(4)), innerW);
      for (const ln of lines2) {
        if (y + 5.2 > contentBottomY()) {
          bodyNewPage();
          y = Math.max(yCol0, yCol1);
        }
        pdf.text(ln, margin, y);
        y += 5.2;
      }
      pdf.setFont(PDF_SANS, "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1;
      yCol0 = yCol1 = y;
      continue;
    }

    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...RG_BODY_TEXT);
    const plain = stripInlineMd(t);
    const wrapped = pdf.splitTextToSize(plain, bodyColW);
    const lineHeight = 4.55;
    for (const ln of wrapped) {
      emitBodyLineBalanced(ln, lineHeight);
    }
  }

  syncBodyY();
  y = Math.max(yCol0, yCol1);

  if (permitPkg) {
    startContinuedPage();
    let wy = 28;
    const a220w = permitPkg.calculations.article_220;
    const a310w = permitPkg.calculations.article_310;
    pdf.setFont(PDF_SANS, "bold");
    pdf.setFontSize(12.5);
    pdf.setTextColor(...RG_NAVY);
    pdf.text("AHJ electrical permit application worksheet", margin, wy);
    wy += 7;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(8.8);
    pdf.setTextColor(...RG_BODY_TEXT);
    const ahjLine = `Authority Having Jurisdiction (scout): ${(permitPkg.ahjLabel || "").trim() || "_______________________________"}`;
    for (const ln of pdf.splitTextToSize(ahjLine, innerW)) {
      pdf.text(ln, margin, wy);
      wy += 4.2;
    }
    wy += 2;
    const addrBlurb = `Job site: ${projAddr} | ZIP ${projZip} | ${localityLabel}`;
    for (const ln of pdf.splitTextToSize(addrBlurb, innerW)) {
      pdf.text(ln, margin, wy);
      wy += 4.2;
    }
    wy += 3;
    pdf.setFont(PDF_SANS, "bold");
    pdf.text("Scope (draft)", margin, wy);
    wy += 5;
    pdf.setFont(PDF_SANS, "normal");
    for (const ln of pdf.splitTextToSize(
      "Residential electrical service upgrade — 200 A planning basis per attached Reg Guard NEC excerpt.",
      innerW,
    )) {
      pdf.text(ln, margin, wy);
      wy += 4.2;
    }
    wy += 2;
    pdf.text(
      `Declared calculated load (planning): ${a220w.feeder_amps_at_240v} A @ 240 V (${a220w.total_calculated_va.toLocaleString()} VA)`,
      margin,
      wy,
    );
    wy += 4.5;
    pdf.text(`Proposed service conductors (planning): ${a310w.selected_conductor_display}`, margin, wy);
    wy += 6;
    pdf.setFont(PDF_SANS, "italic");
    pdf.setFontSize(8);
    for (const ln of pdf.splitTextToSize(
      "Applicant name: ___________________________  Signature: _______________________  Date: __________",
      innerW,
    )) {
      pdf.text(ln, margin, wy);
      wy += 4;
    }
    wy += 2;
    for (const ln of pdf.splitTextToSize(
      "Licensed contractor / master electrician: ___________________________  License #: _______________________",
      innerW,
    )) {
      pdf.text(ln, margin, wy);
      wy += 4;
    }
    wy += 4;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(7.8);
    pdf.setTextColor(82, 88, 98);
    for (const ln of pdf.splitTextToSize(permitPkg.calculations.disclaimer, innerW)) {
      pdf.text(ln, margin, wy);
      wy += 3.8;
    }
  }

  const totalPages = pdf.getNumberOfPages();
  const stamp = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageNumY = pageH - 4;
    let ty = pageNumY - 5 - (footerWrapLines.length - 1) * footerLineH;
    pdf.setFont(PDF_SANS, "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(82, 88, 98);
    for (const ln of footerWrapLines) {
      pdf.text(ln, margin, ty);
      ty += footerLineH;
    }
    pdf.setFontSize(7);
    pdf.setTextColor(115, 120, 130);
    pdf.text(`Page ${i} of ${totalPages} · Generated ${stamp}`, margin, pageNumY);
  }

  pdf.save(permitPkg ? `RegGuard-permit-package-${slugDate()}.pdf` : `RegGuard-punch-list-${slugDate()}.pdf`);
}
