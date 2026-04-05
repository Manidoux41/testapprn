import { appEnv } from '@/constants/env';
import type { RemoteOcrResult } from '@/types/schedule';

export type { RemoteOcrResult } from '@/types/schedule';

interface CustomOcrApiResponse {
  text?: string;
  provider?: string;
  warnings?: string[];
}

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
}

export function hasRemoteOcrConfigured(): boolean {
  return Boolean(appEnv.scheduleOcrApiUrl || appEnv.ocrSpaceApiKey);
}

export async function extractTextWithRemoteOcr(params: {
  bytes: Uint8Array;
  fileName: string;
  mimeType?: string;
}): Promise<RemoteOcrResult | null> {
  const customApiUrl = appEnv.scheduleOcrApiUrl;
  if (customApiUrl) {
    return extractWithCustomApi({
      apiUrl: customApiUrl,
      bytes: params.bytes,
      fileName: params.fileName,
      mimeType: params.mimeType,
    });
  }

  const ocrSpaceApiKey = appEnv.ocrSpaceApiKey;
  if (ocrSpaceApiKey) {
    return extractWithOcrSpace({
      apiKey: ocrSpaceApiKey,
      bytes: params.bytes,
      fileName: params.fileName,
      mimeType: params.mimeType,
    });
  }

  return null;
}

async function extractWithCustomApi(params: {
  apiUrl: string;
  bytes: Uint8Array;
  fileName: string;
  mimeType?: string;
}): Promise<RemoteOcrResult> {
  const response = await fetch(params.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      fileName: params.fileName,
      mimeType: params.mimeType ?? 'application/pdf',
      fileBase64: uint8ArrayToBase64(params.bytes),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Le service OCR distant a retourne une erreur.');
  }

  const payload = (await response.json()) as CustomOcrApiResponse;
  return {
    text: payload.text?.trim() ?? '',
    provider: 'custom-api',
    warnings: payload.warnings ?? [],
  };
}

async function extractWithOcrSpace(params: {
  apiKey: string;
  bytes: Uint8Array;
  fileName: string;
  mimeType?: string;
}): Promise<RemoteOcrResult> {
  const formData = new FormData();
  formData.append(
    'base64Image',
    `data:${params.mimeType ?? 'application/pdf'};base64,${uint8ArrayToBase64(params.bytes)}`
  );
  formData.append('filetype', 'PDF');
  formData.append('language', 'fre');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('filename', params.fileName);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: params.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'OCR.Space n\'a pas pu traiter le document.');
  }

  const payload = (await response.json()) as OcrSpaceResponse;
  const warnings = normalizeOcrSpaceWarnings(payload.ErrorMessage);

  if (payload.IsErroredOnProcessing) {
    throw new Error(warnings.join(' ') || 'OCR.Space a signale une erreur de traitement.');
  }

  const text = (payload.ParsedResults ?? [])
    .map((item) => item.ParsedText?.trim() ?? '')
    .filter(Boolean)
    .join('\n');

  return {
    text,
    provider: 'ocr-space',
    warnings,
  };
}

function normalizeOcrSpaceWarnings(value?: string | string[]): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const chunk = (first << 16) | (second << 8) | third;

    result += chars[(chunk >> 18) & 63];
    result += chars[(chunk >> 12) & 63];
    result += index + 1 < bytes.length ? chars[(chunk >> 6) & 63] : '=';
    result += index + 2 < bytes.length ? chars[chunk & 63] : '=';
  }

  return result;
}