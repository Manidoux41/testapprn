export interface JournalEntry {
  id: string;
  date: string;
  time: string;
  title: string;
  content: string;
  category: 'trajet' | 'incident' | 'remarque' | 'maintenance';
  tags: string[];
}

export interface CheckItem {
  id: string;
  category: string;
  label: string;
  critical: boolean;
  checked: boolean;
  note?: string;
}
