/**
 * Expert Brain: Contractor Action Plan → printable Reg Guard punch list PDF
 * 
 * NOTE: PDF generation functionality disabled in Phase 0.
 * This will be re-enabled in Phase 1 when jsPDF is added back.
 */

// Type stubs for Phase 0
export type PermitDraftCalculations = {
  scope: string;
  nec_edition_note: string;
  article_220: any;
  article_310: any;
  disclaimer: string;
};

export type PermitVisionOverlay = {
  detections?: Array<any>;
} | null;

export async function fetchPermitDraftCalculations(jobDescription: string): Promise<PermitDraftCalculations> {
  throw new Error("PDF generation not available in Phase 0");
}

export async function renderAnnotatedSitePhotoDataUrl(
  photoObjectUrl: string | null,
  vision: PermitVisionOverlay,
): Promise<string | null> {
  return null;
}

export async function downloadPermitPackagePdf(options: any): Promise<void> {
  console.warn("PDF download not available in Phase 0");
}

export function downloadActionPlanPdf(options: any): void {
  console.warn("PDF download not available in Phase 0");
}
