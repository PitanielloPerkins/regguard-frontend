/**
 * Expert Brain: Contractor Action Plan → printable Reg Guard punch list PDF (jsPDF).
 */
import { jsPDF } from "jspdf";

/** Reg Guard “construction navy” — matches index.css */
const RG_NAVY: [number, number, number] = [13, 27, 42];
const RG_LINK: [number, number, number] = [168, 197, 232];
const RG_BODY_TEXT: [number, number, number] = [33, 38, 48];

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

export function downloadActionPlanPdf(options: {
  markdown: string;
  siteAddress?: string | null;
  zip?: string | null;
  city?: string | null;
}): void {
  const trimmed = options.markdown.trim();
  if (!trimmed) {
    return;
  }

  const pdf = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const innerW = pageW - 2 * margin;
  const footerReserve = 14;

  let y = 0;

  const drawFirstPageHeader = () => {
    pdf.setFillColor(...RG_NAVY);
    pdf.rect(0, 0, pageW, 34, "F");

    const markX = margin;
    const markY = 7.5;
    pdf.setFillColor(...RG_LINK);
    pdf.roundedRect(markX, markY, 12, 12, 2.2, 2.2, "F");
    pdf.setTextColor(...RG_NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.2);
    pdf.text("RG", markX + 2.6, markY + 8.2);

    const textX = margin + 16;
    pdf.setTextColor(224, 225, 221);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Reg Guard", textX, 15);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.8);
    pdf.setTextColor(...RG_LINK);
    pdf.text("Agentic compliance assistant for contractors", textX, 21);

    const locBits: string[] = [];
    if (options.siteAddress?.trim()) {
      locBits.push(options.siteAddress.trim());
    }
    if (options.city?.trim()) {
      locBits.push(options.city.trim());
    }
    if (options.zip?.trim()) {
      locBits.push(`ZIP ${options.zip.trim()}`);
    }
    const loc = locBits.join(" · ");
    if (loc) {
      pdf.setFontSize(7.6);
      pdf.setTextColor(200, 206, 220);
      const locLines = pdf.splitTextToSize(loc.slice(0, 200), innerW - 16);
      let ly = 27;
      for (const ln of locLines) {
        pdf.text(ln, textX, ly);
        ly += 3.6;
      }
    }

    pdf.setDrawColor(...RG_LINK);
    pdf.setLineWidth(0.35);
    pdf.line(margin, 31.5, pageW - margin, 31.5);

    pdf.setTextColor(...RG_BODY_TEXT);
    y = 40;
  };

  const startContinuedPage = () => {
    pdf.addPage();
    pdf.setDrawColor(190, 195, 205);
    pdf.setLineWidth(0.25);
    pdf.line(margin, 14, pageW - margin, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...RG_NAVY);
    pdf.text("Reg Guard · Contractor punch list (continued)", margin, 21);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...RG_BODY_TEXT);
    y = 28;
  };

  const checkBreak = (nextBlockMm: number) => {
    if (y + nextBlockMm > pageH - footerReserve) {
      startContinuedPage();
    }
  };

  drawFirstPageHeader();

  const rawLines = trimmed.split(/\r?\n/);
  for (const raw of rawLines) {
    const line = raw.trimEnd();
    const t = line.trim();

    if (t === "---" || t === "***") {
      checkBreak(6);
      y += 2;
      pdf.setDrawColor(210, 215, 222);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageW - margin, y);
      y += 5;
      continue;
    }

    if (!t) {
      y += 2.8;
      continue;
    }

    if (t.startsWith("# ") && !t.startsWith("##")) {
      checkBreak(10);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(...RG_NAVY);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(2)), innerW);
      for (const ln of lines2) {
        checkBreak(7);
        pdf.text(ln, margin, y);
        y += 7;
      }
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1.2;
      continue;
    }

    if (t.startsWith("## ") && !t.startsWith("###")) {
      checkBreak(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12.5);
      pdf.setTextColor(...RG_NAVY);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(3)), innerW);
      for (const ln of lines2) {
        checkBreak(5.8);
        pdf.text(ln, margin, y);
        y += 5.8;
      }
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1.5;
      continue;
    }

    if (t.startsWith("### ")) {
      checkBreak(7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.6);
      pdf.setTextColor(55, 65, 80);
      const lines2 = pdf.splitTextToSize(stripInlineMd(t.slice(4)), innerW);
      for (const ln of lines2) {
        checkBreak(5.2);
        pdf.text(ln, margin, y);
        y += 5.2;
      }
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...RG_BODY_TEXT);
      y += 1;
      continue;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...RG_BODY_TEXT);
    const plain = stripInlineMd(t);
    const wrapped = pdf.splitTextToSize(plain, innerW);
    const lineHeight = 4.55;
    for (const ln of wrapped) {
      checkBreak(lineHeight);
      pdf.text(ln, margin, y);
      y += lineHeight;
    }
  }

  const totalPages = pdf.getNumberOfPages();
  const stamp = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(115, 120, 130);
    pdf.text(
      `Page ${i} of ${totalPages} · Generated ${stamp} · Verify codes and fees with the AHJ before work.`,
      margin,
      pageH - 7,
    );
  }

  pdf.save(`RegGuard-punch-list-${slugDate()}.pdf`);
}
