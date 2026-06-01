import { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export function useTheme() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    const savedPreference = localStorage.getItem('themePreference');
    if (savedPreference === 'light' || savedPreference === 'dark' || savedPreference === 'system') {
      return savedPreference;
    }
    return 'system';
  });
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveTheme = (preference: ThemePreference, isDark: boolean): ThemeMode => {
      if (preference === 'system') {
        return isDark ? 'dark' : 'light';
      }
      return preference;
    };

    setTheme(resolveTheme(themePreference, mediaQuery.matches));

    const handler = (event: MediaQueryListEvent) => {
      if (themePreference === 'system') {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    localStorage.setItem('themePreference', themePreference);
    localStorage.setItem('theme', theme);
  }, [theme, themePreference]);

  const toggleThemePreference = () => {
    setThemePreference(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, themePreference, toggleThemePreference };
}
