'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('medprep_theme');
    const initialTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  const selectTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('medprep_theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <div role="group" aria-label="Color theme" className="inline-flex items-center gap-1 rounded-lg border border-border2 bg-surface2 p-1">
      <button type="button" onClick={() => selectTheme('light')} aria-label="Use light theme" aria-pressed={theme === 'light'} title="Light theme" className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${theme === 'light' ? 'bg-accent text-white' : 'text-text2 hover:bg-surface3'}`}>
        <Sun size={15} aria-hidden="true" />
        <span>Light</span>
      </button>
      <button type="button" onClick={() => selectTheme('dark')} aria-label="Use dark theme" aria-pressed={theme === 'dark'} title="Dark theme" className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${theme === 'dark' ? 'bg-accent text-white' : 'text-text2 hover:bg-surface3'}`}>
        <Moon size={15} aria-hidden="true" />
        <span>Dark</span>
      </button>
    </div>
  );
}