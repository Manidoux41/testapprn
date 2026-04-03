import { envMessages } from '@/constants/env';
import { extractTextWithRemoteOcr, hasRemoteOcrConfigured } from '@/utils/schedule-ocr';

export interface ScheduleEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  origin?: string;
  destination?: string;
  durationMinutes: number;
  sourceText: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScheduleDay {
  date: string;
  entries: ScheduleEntry[];
  totalServiceMinutes: number;
  amplitudeMinutes: number;
}

export interface ScheduleExtractionResult {
  fileName: string;
  extractedText: string;
  entries: ScheduleEntry[];
  days: ScheduleDay[];
  warnings: string[];
  extractionMode: 'local' | 'ocr' | 'hybrid';
  extractionProvider: string;
}

const WEEKDAY_REGEX = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i;
const DATE_REGEX = /(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/;
const TIME_REGEX = /\b([01]?\d|2[0-3])[:h.]([0-5]\d)\b/g;

export async function extractScheduleFromPdfBytes(
  bytes: Uint8Array,
  fileName: string
): Promise<ScheduleExtractionResult> {
  const localText = normalizeExtractedText(extractTextFromPdf(bytes));
  const warnings: string[] = [];
  let extractedText = localText;
  let extractionMode: ScheduleExtractionResult['extractionMode'] = 'local';
  let extractionProvider = 'analyse locale PDF';

  const localEntries = parseScheduleEntries(localText);
  const shouldUseOcr = shouldEscalateToOcr(localText, localEntries);

  if (shouldUseOcr) {
    if (hasRemoteOcrConfigured()) {
      try {
        const remoteResult = await extractTextWithRemoteOcr({
          bytes,
          fileName,
          mimeType: 'application/pdf',
        });

        if (remoteResult?.text.trim()) {
          const remoteText = normalizeExtractedText(remoteResult.text);
          extractedText = mergeExtractedTexts(localText, remoteText);
          extractionMode = localText ? 'hybrid' : 'ocr';
          extractionProvider =
            remoteResult.provider === 'custom-api' ? 'service OCR distant' : 'OCR.Space';
          warnings.push(...remoteResult.warnings);
        } else {
          warnings.push(
            'Le service OCR a ete appele mais n\'a renvoye aucun texte exploitable.'
          );
        }
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `Le service OCR distant a echoue: ${error.message}`
            : 'Le service OCR distant a echoue.'
        );
      }
    } else {
      warnings.push(envMessages.remoteOcrMissing);
    }
  }

  if (!extractedText.trim()) {
    warnings.push(
      'Aucun texte exploitable n\'a ete trouve dans le PDF. Si la feuille de route est un scan image, un module OCR/IA serveur sera necessaire.'
    );
  }

  const entries = parseScheduleEntries(extractedText);
  const days = groupEntriesByDay(entries);

  if (entries.length === 0) {
    warnings.push(
      'Aucun horaire n\'a pu etre extrait automatiquement. Verifiez que le PDF contient bien du texte selectionnable.'
    );
  }

  if (entries.length > 0 && entries.some((entry) => entry.confidence !== 'high')) {
    warnings.push(
      'Certaines lignes ont ete interpretees de maniere heuristique. Verifiez les horaires avant de vous appuyer sur le calcul des temps de travail.'
    );
  }

  return {
    fileName,
    extractedText,
    entries,
    days,
    warnings,
    extractionMode,
    extractionProvider,
  };
}

function shouldEscalateToOcr(text: string, entries: ScheduleEntry[]): boolean {
  if (!text.trim()) {
    return true;
  }

  const normalizedLength = text.replace(/\s+/g, ' ').trim().length;
  if (normalizedLength < 120) {
    return true;
  }

  if (entries.length === 0) {
    return true;
  }

  const timeMatchCount = [...text.matchAll(TIME_REGEX)].length;
  return timeMatchCount < Math.max(2, entries.length * 2);
}

function mergeExtractedTexts(localText: string, remoteText: string): string {
  if (!localText.trim()) {
    return remoteText;
  }

  if (!remoteText.trim()) {
    return localText;
  }

  const mergedLines = new Set<string>();
  for (const line of `${localText}\n${remoteText}`.split('\n')) {
    const normalizedLine = line.trim();
    if (normalizedLine) {
      mergedLines.add(normalizedLine);
    }
  }

  return [...mergedLines].join('\n');
}

function extractTextFromPdf(bytes: Uint8Array): string {
  const raw = bytesToString(bytes);
  const textOperations: string[] = [];

  const operatorRegex = /(\[(?:.|\n|\r)*?\]|\((?:\\.|[^\\()])*\))\s*TJ?/g;
  let operatorMatch: RegExpExecArray | null;
  while ((operatorMatch = operatorRegex.exec(raw)) !== null) {
    const token = operatorMatch[1];
    if (token.startsWith('[')) {
      const chunkRegex = /\((?:\\.|[^\\()])*\)/g;
      const parts = token.match(chunkRegex) ?? [];
      const line = parts
        .map((part) => decodePdfString(part.slice(1, -1)))
        .join(' ')
        .trim();
      if (isUsefulText(line)) {
        textOperations.push(line);
      }
    } else {
      const decoded = decodePdfString(token.slice(1, -1)).trim();
      if (isUsefulText(decoded)) {
        textOperations.push(decoded);
      }
    }
  }

  if (textOperations.length > 0) {
    return textOperations.join('\n');
  }

  const fallbackStrings = raw.match(/\((?:\\.|[^\\()])*\)/g) ?? [];
  return fallbackStrings
    .map((part) => decodePdfString(part.slice(1, -1)).trim())
    .filter(isUsefulText)
    .join('\n');
}

function bytesToString(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let result = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    result += String.fromCharCode(...chunk);
  }

  return result;
}

function decodePdfString(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsefulText(value: string): boolean {
  if (!value || value.length < 3) {
    return false;
  }

  const printable = value.replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
  return printable.length / value.length > 0.7;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/gi, '\n$1')
    .replace(/(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/g, '\n$1')
    .replace(/\n+/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function parseScheduleEntries(text: string): ScheduleEntry[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: ScheduleEntry[] = [];
  let currentDate: string | null = null;

  for (const line of lines) {
    const lineDate = extractDate(line);
    if (lineDate) {
      currentDate = lineDate;
    }

    const times = [...line.matchAll(TIME_REGEX)];
    if (times.length < 2 || !currentDate) {
      continue;
    }

    const startTime = normalizeTime(times[0][0]);
    const endTime = normalizeTime(times[1][0]);
    const durationMinutes = calculateDurationMinutes(startTime, endTime);

    const cleanedLine = line
      .replace(WEEKDAY_REGEX, ' ')
      .replace(DATE_REGEX, ' ')
      .replace(TIME_REGEX, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const { title, origin, destination, confidence } = parseRouteMetadata(cleanedLine);
    entries.push({
      id: `${currentDate}-${startTime}-${entries.length + 1}`,
      date: currentDate,
      startTime,
      endTime,
      title,
      origin,
      destination,
      durationMinutes,
      sourceText: line,
      confidence,
    });
  }

  return entries.sort(compareEntries);
}

function extractDate(line: string): string | null {
  const match = line.match(DATE_REGEX);
  if (!match) {
    return null;
  }

  const [dayPart, monthPart, yearPart] = match[1].split(/[\/.-]/);
  const day = pad2(dayPart);
  const month = pad2(monthPart);
  const currentYear = new Date().getFullYear();
  const year = yearPart ? normalizeYear(yearPart) : String(currentYear);
  return `${year}-${month}-${day}`;
}

function normalizeYear(yearPart: string): string {
  return yearPart.length === 2 ? `20${yearPart}` : yearPart;
}

function normalizeTime(value: string): string {
  const [hours, minutes] = value.replace('.', ':').replace('h', ':').split(':');
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function pad2(value: string): string {
  return value.padStart(2, '0');
}

function parseRouteMetadata(cleanedLine: string): {
  title: string;
  origin?: string;
  destination?: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const normalized = cleanedLine.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return {
      title: 'Service planifie',
      confidence: 'low',
    };
  }

  const arrowMatch = normalized.match(/(.+?)\s*(?:->|→|vers|- )\s*(.+)/i);
  if (arrowMatch) {
    return {
      title: `${arrowMatch[1].trim()} - ${arrowMatch[2].trim()}`,
      origin: arrowMatch[1].trim(),
      destination: arrowMatch[2].trim(),
      confidence: 'high',
    };
  }

  const segments = normalized.split(/\s+-\s+/).map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) {
    return {
      title: `${segments[0]} - ${segments[1]}`,
      origin: segments[0],
      destination: segments[1],
      confidence: 'medium',
    };
  }

  return {
    title: normalized,
    confidence: 'medium',
  };
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (end < start) {
    end += 24 * 60;
  }

  return end - start;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function groupEntriesByDay(entries: ScheduleEntry[]): ScheduleDay[] {
  const grouped = new Map<string, ScheduleEntry[]>();

  for (const entry of entries) {
    const dayEntries = grouped.get(entry.date) ?? [];
    dayEntries.push(entry);
    grouped.set(entry.date, dayEntries);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayEntries]) => {
      const sortedEntries = [...dayEntries].sort(compareEntries);
      const totalServiceMinutes = sortedEntries.reduce(
        (total, entry) => total + entry.durationMinutes,
        0
      );
      const amplitudeMinutes = calculateDurationMinutes(
        sortedEntries[0].startTime,
        sortedEntries[sortedEntries.length - 1].endTime
      );

      return {
        date,
        entries: sortedEntries,
        totalServiceMinutes,
        amplitudeMinutes,
      };
    });
}

function compareEntries(left: ScheduleEntry, right: ScheduleEntry): number {
  if (left.date !== right.date) {
    return left.date.localeCompare(right.date);
  }

  return left.startTime.localeCompare(right.startTime);
}
