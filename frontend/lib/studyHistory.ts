import api from './api';

export type StudyHistorySection = 'quiz' | 'flashcards' | 'lesson' | 'course-lesson' | 'case' | 'tutor' | 'review';
export type StudyHistoryEntry = {
  _id: string;
  section: StudyHistorySection;
  title: string;
  prompt: string;
  response: string;
  createdAt: string;
};

export async function saveStudyHistory(entry: {
  section: StudyHistorySection;
  title: string;
  prompt: string;
  response: string;
}) {
  try {
    const { data } = await api.post('/history', entry);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study-history-updated', { detail: entry.section }));
    }
    return data.entry as StudyHistoryEntry;
  } catch {
    return null;
  }
}

export function stringifyStudyResponse(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function parseStudyResponse<T>(entry: StudyHistoryEntry): T | null {
  try {
    return JSON.parse(entry.response) as T;
  } catch {
    return null;
  }
}
