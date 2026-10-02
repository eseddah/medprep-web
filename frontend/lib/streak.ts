import api from './api';

export interface StreakDay {
  date: string;
  day: string;
  active: boolean;
  today: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
  last7Days: StreakDay[];
  weekDays: StreakDay[];
}

export async function recordStreakActivity() {
  const { data } = await api.post<StreakSummary>('/streak/activity');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('medprep:streak-updated'));
  return data;
}