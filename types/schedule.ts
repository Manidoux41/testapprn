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

export interface RemoteOcrResult {
  text: string;
  provider: 'custom-api' | 'ocr-space';
  warnings: string[];
}

export type AgendaEntry = ScheduleDay['entries'][number] & {
  missionColor?: string;
  sourceType: 'import' | 'manual';
};

export interface AgendaDay {
  date: string;
  entries: AgendaEntry[];
  totalServiceMinutes: number;
  amplitudeMinutes: number;
}

export interface ManualMission {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  origin?: string;
  destination?: string;
  missionColor: string;
}

export interface CalendarCell {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  missionCount: number;
}
