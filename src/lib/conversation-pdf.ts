import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OrgBranding } from "@/contexts/BrandingContext";

export interface ConversationPdfMessage {
  id: string;
  createdAt: string;
  senderLabel: string;
  direction: "incoming" | "outgoing";
  content: string;
}

interface ExportConversationPdfParams {
  branding: Partial<OrgBranding> | null;
  leadName: string;
  leadPhone?: string | null;
  messages: ConversationPdfMessage[];
  periodLabel: string;
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_PX = 794;
const PAGE_MARGIN_MM = 14;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
const TOP_BAND_HEIGHT_MM = 14;
const HEADER_HEIGHT_MM = 34;
const CONTENT_TOP_MM = TOP_BAND_HEIGHT_MM + HEADER_HEIGHT_MM + 18;
const FOOTER_HEIGHT_MM = 16;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - CONTENT_TOP_MM - FOOTER_HEIGHT_MM;
const CONTENT_WIDTH_PX = 690;

function hslStringToRgb(value?: string | null): { r: number; g: number; b: number } {
  const fallback = { r: 232, g: 93, b: 36 };
  if (!value) return fallback;

  const normalized = value
    .replace(/hsl\(/gi, "")
    .replace(/\)/g, "")
    .replace(/,/g, " ")
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return fallback;

  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", "")) / 100;
  const l = Number(parts[2].replace("%", "")) / 100;
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return fallback;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

function hslStringToCss(value?: string | null, fallback = "20 80% 52%"): string {
  const raw = value?.trim() || fallback;
  return raw.startsWith("hsl(") ? raw : `hsl(${raw})`;
}

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function formatMessageTimestamp(createdAt: string): string {
  return format(parseISO(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function buildPeriodLabel(messages: ConversationPdfMessage[], explicitLabel: string): string {
  if (!messages.length) return explicitLabel;
  const first = formatMessageTimestamp(messages[0].createdAt);
  const last = formatMessageTimestamp(messages[messages.length - 1].createdAt);
  return `${explicitLabel}\n${first} até ${last}`;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addPageChrome(
  doc: any,
  branding: Partial<OrgBranding> | null,
  leadName: string,
  leadPhone: string | null | undefined,
  periodLabel: string,
  pageNumber: number,
  logoDataUrl: string | null
) {
  const primary = hslStringToRgb(branding?.color_primary);
  const accent = hslStringToRgb(branding?.color_accent ?? "20 100% 97%");
  const brandName = branding?.brand_name || "CRM";

  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, PAGE_WIDTH_MM, TOP_BAND_HEIGHT_MM, "F");

  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.roundedRect(PAGE_MARGIN_MM, TOP_BAND_HEIGHT_MM + 6, PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2, HEADER_HEIGHT_MM, 6, 6, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", PAGE_MARGIN_MM + 4, TOP_BAND_HEIGHT_MM + 11, 16, 16, undefined, "FAST");
    } catch {
      doc.addImage(logoDataUrl, "JPEG", PAGE_MARGIN_MM + 4, TOP_BAND_HEIGHT_MM + 11, 16, 16, undefined, "FAST");
    }
  }

  doc.setTextColor(38, 38, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(brandName, PAGE_MARGIN_MM + (logoDataUrl ? 24 : 6), TOP_BAND_HEIGHT_MM + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("Exportação de conversa", PAGE_MARGIN_MM + (logoDataUrl ? 24 : 6), TOP_BAND_HEIGHT_MM + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(leadName, PAGE_WIDTH_MM - PAGE_MARGIN_MM - 6, TOP_BAND_HEIGHT_MM + 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  if (leadPhone) {
    doc.text(leadPhone, PAGE_WIDTH_MM - PAGE_MARGIN_MM - 6, TOP_BAND_HEIGHT_MM + 21, { align: "right" });
  }

  const periodLines = doc.splitTextToSize(periodLabel, PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2 - 12);
  doc.setTextColor(80, 80, 80);
  doc.text(periodLines, PAGE_MARGIN_MM + 6, TOP_BAND_HEIGHT_MM + 30);

  doc.setFontSize(8);
  doc.text(`Página ${pageNumber}`, PAGE_WIDTH_MM - PAGE_MARGIN_MM - 6, PAGE_HEIGHT_MM - 6, { align: "right" });
}

function createRoot(): HTMLDivElement {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-20000px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH_PX}px`;
  root.style.pointerEvents = "none";
  root.style.opacity = "0";
  root.style.zIndex = "-1";
  root.style.background = "#ffffff";
  document.body.appendChild(root);
  return root;
}

function createConversationContent(messages: ConversationPdfMessage[], primaryColor: string): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = `${CONTENT_WIDTH_PX}px`;
  container.style.background = "#ffffff";
  container.style.padding = "0";
  container.style.margin = "0";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";
  container.style.fontFamily =
    "\"Segoe UI Emoji\", \"Apple Color Emoji\", \"Noto Color Emoji\", Inter, system-ui, sans-serif";
  container.style.color = "#18181b";

  let lastMessageDate: Date | null = null;

  for (const message of messages) {
    const currentDate = parseISO(message.createdAt);

    if (!lastMessageDate || !isSameDay(lastMessageDate, currentDate)) {
      const separator = document.createElement("div");
      separator.dataset.exportBlock = "true";
      separator.style.display = "flex";
      separator.style.alignItems = "center";
      separator.style.justifyContent = "center";
      separator.style.position = "relative";
      separator.style.padding = "10px 0 2px";

      const line = document.createElement("div");
      line.style.position = "absolute";
      line.style.left = "0";
      line.style.right = "0";
      line.style.top = "50%";
      line.style.height = "1px";
      line.style.background = "#e7e7ec";
      separator.appendChild(line);

      const pill = document.createElement("div");
      pill.textContent = format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      pill.style.position = "relative";
      pill.style.padding = "6px 14px";
      pill.style.borderRadius = "999px";
      pill.style.background = "#ffffff";
      pill.style.fontSize = "11px";
      pill.style.fontWeight = "700";
      pill.style.color = "#8b8b96";
      pill.style.textTransform = "uppercase";
      pill.style.letterSpacing = "0.04em";
      container.appendChild(separator);
      separator.appendChild(pill);
    }

    const row = document.createElement("div");
    row.dataset.exportBlock = "true";
    row.style.display = "flex";
    row.style.justifyContent = message.direction === "outgoing" ? "flex-end" : "flex-start";

    const bubble = document.createElement("div");
    bubble.style.maxWidth = "78%";
    bubble.style.borderRadius = "22px";
    bubble.style.padding = "14px 16px 12px";
    bubble.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.06)";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.wordBreak = "break-word";
    bubble.style.overflowWrap = "anywhere";
    bubble.style.fontSize = "14px";
    bubble.style.lineHeight = "1.55";
    bubble.style.letterSpacing = "0";
    bubble.style.fontKerning = "normal";
    bubble.style.textRendering = "optimizeLegibility";
    bubble.style.fontFamily =
      "\"Segoe UI Emoji\", \"Apple Color Emoji\", \"Noto Color Emoji\", Inter, system-ui, sans-serif";

    if (message.direction === "outgoing") {
      bubble.style.background = primaryColor;
      bubble.style.color = "#ffffff";
      bubble.style.borderTopRightRadius = "8px";
    } else {
      bubble.style.background = "#fafaf9";
      bubble.style.color = "#18181b";
      bubble.style.border = "1px solid #e6e7eb";
      bubble.style.borderTopLeftRadius = "8px";
    }

    const meta = document.createElement("div");
    meta.textContent = `${message.senderLabel} • ${format(parseISO(message.createdAt), "HH:mm", { locale: ptBR })}`;
    meta.style.fontSize = "11px";
    meta.style.fontWeight = "700";
    meta.style.opacity = "0.85";
    meta.style.marginBottom = "8px";
    bubble.appendChild(meta);

    const text = document.createElement("div");
    text.textContent = message.content;
    text.style.whiteSpace = "pre-wrap";
    text.style.wordBreak = "break-word";
    text.style.overflowWrap = "anywhere";
    text.style.letterSpacing = "0";
    text.style.fontKerning = "normal";
    text.style.fontFamily =
      "\"Segoe UI Emoji\", \"Apple Color Emoji\", \"Noto Color Emoji\", Inter, system-ui, sans-serif";
    bubble.appendChild(text);

    row.appendChild(bubble);
    container.appendChild(row);

    lastMessageDate = currentDate;
  }

  return container;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

function computePageBreaks(content: HTMLDivElement): number[] {
  const blocks = Array.from(content.querySelectorAll<HTMLElement>("[data-export-block='true']"));
  if (!blocks.length) return [0];

  const cssPxPerMm = content.offsetWidth / CONTENT_WIDTH_MM;
  const pageHeightCssPx = CONTENT_HEIGHT_MM * cssPxPerMm;
  const breaks = [0];
  let currentPageStart = 0;

  for (const block of blocks) {
    const blockTop = block.offsetTop;
    const blockBottom = block.offsetTop + block.offsetHeight;

    if (blockBottom - currentPageStart <= pageHeightCssPx) {
      continue;
    }

    if (blockTop <= currentPageStart) {
      currentPageStart = blockBottom;
      breaks.push(currentPageStart);
      continue;
    }

    currentPageStart = blockTop;
    breaks.push(currentPageStart);
  }

  return breaks;
}

export async function exportConversationPdf({
  branding,
  leadName,
  leadPhone,
  messages,
  periodLabel,
}: ExportConversationPdfParams): Promise<void> {
  if (!messages.length) return;

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const primaryColor = hslStringToCss(branding?.color_primary, "20 80% 52%");
  const logoDataUrl = branding?.logo_url ? await loadImageAsDataUrl(branding.logo_url) : null;
  const fullPeriodLabel = buildPeriodLabel(messages, periodLabel);
  const root = createRoot();

  try {
    const content = createConversationContent(messages, primaryColor);
    root.appendChild(content);

    await document.fonts?.ready;

    const contentCanvas = await html2canvas(content, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const scaleFactor = contentCanvas.width / content.offsetWidth;
    const pageBreaksCssPx = computePageBreaks(content);
    const pageBreaksCanvasPx = pageBreaksCssPx.map((value) => Math.floor(value * scaleFactor));
    const pageStarts = [...pageBreaksCanvasPx, contentCanvas.height];
    const totalPages = Math.max(1, pageStarts.length - 1);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      if (pageIndex > 0) doc.addPage();

      addPageChrome(
        doc,
        branding,
        leadName,
        leadPhone,
        fullPeriodLabel,
        pageIndex + 1,
        logoDataUrl
      );

      const sourceY = pageStarts[pageIndex];
      const sliceHeightPx = Math.max(1, pageStarts[pageIndex + 1] - sourceY);

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = contentCanvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Não foi possível preparar a exportação do PDF.");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        contentCanvas,
        0,
        sourceY,
        contentCanvas.width,
        sliceHeightPx,
        0,
        0,
        contentCanvas.width,
        sliceHeightPx
      );

      const imageData = canvasToDataUrl(pageCanvas);
      const renderedHeightMm = sliceHeightPx / scaleFactor / (content.offsetWidth / CONTENT_WIDTH_MM);
      doc.addImage(
        imageData,
        "PNG",
        PAGE_MARGIN_MM,
        CONTENT_TOP_MM,
        CONTENT_WIDTH_MM,
        renderedHeightMm,
        undefined,
        "FAST"
      );
    }

    const fileName = `${sanitizeFileName(leadName || "conversa") || "conversa"}-exportacao.pdf`;
    doc.save(fileName);
  } finally {
    root.remove();
  }
}
