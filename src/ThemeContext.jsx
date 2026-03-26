import { createContext, useContext, useState } from 'react';

export const THEMES = {
  dark: {
    bg: '#0a0a0f',
    surface: '#13131a',
    surface2: '#1e1e2e',
    surface3: '#252535',
    text: '#ffffff',
    textSec: '#888888',
    textMuted: '#555555',
    border: '#1e1e2e',
    accent: '#d4202a',
    accentHover: '#b81c24',
    green: '#22c55e',
    blue: '#3b82f6',
    gold: '#f59e0b',
    cardShadow: '0 2px 12px rgba(0,0,0,0.4)',
    headerBg: '#13131a',
  },
  light: {
    bg: '#f0f2f8',
    surface: '#ffffff',
    surface2: '#f4f6fb',
    surface3: '#e8eaf0',
    text: '#1a1a2e',
    textSec: '#666677',
    textMuted: '#9999aa',
    border: '#e4e6ef',
    accent: '#d4202a',
    accentHover: '#b81c24',
    green: '#16a34a',
    blue: '#2563eb',
    gold: '#d97706',
    cardShadow: '0 2px 12px rgba(0,0,0,0.08)',
    headerBg: '#ffffff',
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('np_theme');
    return saved ? saved === 'dark' : true;
  });

  const theme = isDark ? THEMES.dark : THEMES.light;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('np_theme', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
