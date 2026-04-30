const WRAPPER_KEYS = new Set(["items", "sections", "values", "answers", "inputs"]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLabel(rawLabel: string) {
  const cleaned = normalizeWhitespace(
    rawLabel
      .replace(/[_-]+/g, " ")
      .replace(/\s+\d+$/, "")
      .replace(/^\d+\s+/, ""),
  );

  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isMeaningfulPrimitive(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return normalizeWhitespace(value) !== "";
  return true;
}

function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(isEmptyValue);
  if (value && typeof value === "object") {
    return Object.values(value).every(isEmptyValue);
  }
  return !isMeaningfulPrimitive(value);
}

function formatPrimitive(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value).trim();
}

function formatResponseValue(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(depth);

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (isEmptyValue(item)) return [];
      if (item && typeof item === "object") {
        const nested = formatResponseValue(item, depth + 1);
        return nested.length ? [`${indent}- Item`, ...nested] : [];
      }

      return [`${indent}- ${formatPrimitive(item)}`];
    });
  }

  if (!value || typeof value !== "object") {
    const primitive = formatPrimitive(value);
    return primitive ? [`${indent}${primitive}`] : [];
  }

  return Object.entries(value).flatMap(([rawKey, item]) => {
    if (isEmptyValue(item)) return [];

    const normalizedKey = normalizeLabel(rawKey);
    const lowerKey = normalizedKey.toLowerCase();

    if (WRAPPER_KEYS.has(lowerKey)) {
      return formatResponseValue(item, depth);
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      const hasChecklistShape = "checked" in record || "resposta" in record;

      if (hasChecklistShape) {
        const checked = Boolean(record.checked);
        const resposta = formatPrimitive(record.resposta);
        const lines = [`${indent}${checked ? "[x]" : "[ ]"} ${normalizedKey}`];
        if (resposta) {
          lines.push(`${indent}  Resposta: ${resposta}`);
        }
        return lines;
      }

      const nested = formatResponseValue(item, depth + 1);
      if (!nested.length) return [];

      return normalizedKey ? [`${indent}${normalizedKey}`, ...nested] : nested;
    }

    const primitive = formatPrimitive(item);
    if (!primitive) return [];

    if (lowerKey === "texto") {
      return [`${indent}${primitive}`];
    }

    return normalizedKey ? [`${indent}- ${normalizedKey}: ${primitive}`] : [`${indent}- ${primitive}`];
  });
}

function stripSerializedMetadata(line: string) {
  const match = line.match(/^([^:]+):\s*(.*)$/);
  if (!match) return line.trim();

  const rawLabel = match[1].trim();
  const value = match[2].trim();
  const normalizedLabel = normalizeLabel(rawLabel);
  const lowerLabel = normalizedLabel.toLowerCase();

  if (!value && (lowerLabel === "items" || lowerLabel === "sections" || lowerLabel === "values")) {
    return "";
  }

  if (lowerLabel === "checked") {
    return value.toLowerCase() === "true" ? "Status: concluído" : "Status: pendente";
  }

  if (lowerLabel === "resposta" && !value) {
    return "";
  }

  if (lowerLabel === "texto") {
    return value;
  }

  if (!value) {
    return normalizedLabel;
  }

  return normalizedLabel ? `${normalizedLabel}: ${value}` : value;
}

export function buildMaterialContent(title: string, response: unknown) {
  const body = formatResponseValue(response)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return [`# ${title}`, body].filter(Boolean).join("\n\n").trim();
}

export function formatMaterialContent(rawContent: string) {
  const normalized = String(rawContent || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const formattedLines = lines
    .map((line) => {
      if (!line.trim()) return "";
      if (line.trimStart().startsWith("#")) return line.trim();

      const leadingSpaces = line.match(/^\s*/)?.[0].length ?? 0;
      const indent = "  ".repeat(Math.floor(leadingSpaces / 2));
      const cleaned = stripSerializedMetadata(line.trim());
      if (!cleaned) return "";

      if (cleaned.startsWith("Status:")) {
        return `${indent}${cleaned}`;
      }

      const isHeading = !cleaned.includes(":");
      if (isHeading) {
        return `${indent}${cleaned}`;
      }

      return `${indent}- ${cleaned}`;
    })
    .filter((line, index, array) => {
      if (!line) return false;
      const previous = array[index - 1];
      return previous !== line;
    });

  const collapsedLines: string[] = [];

  for (let index = 0; index < formattedLines.length; index += 1) {
    const currentLine = formattedLines[index];
    const nextLine = formattedLines[index + 1];
    const trimmedCurrent = currentLine.trim();
    const trimmedNext = nextLine?.trim() || "";

    const isPlainHeading =
      trimmedCurrent &&
      !trimmedCurrent.startsWith("#") &&
      !trimmedCurrent.startsWith("-") &&
      !trimmedCurrent.startsWith("[");

    if (isPlainHeading && (trimmedNext === "Status: concluído" || trimmedNext === "Status: pendente")) {
      collapsedLines.push(`${trimmedNext === "Status: concluído" ? "[x]" : "[ ]"} ${trimmedCurrent}`);
      index += 1;
      continue;
    }

    collapsedLines.push(currentLine);
  }

  return collapsedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function getMaterialPreviewText(rawContent: string, maxLength = 150) {
  const text = formatMaterialContent(rawContent)
    .replace(/^#\s+/gm, "")
    .replace(/^\[(x| )\]\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
