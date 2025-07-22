import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children, initialTheme }) => {
  const [theme, setTheme] = useState(() => {
    // Try to load from localStorage first
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    // Otherwise, use system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return initialTheme || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 