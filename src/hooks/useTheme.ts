import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // Suporte a ambas as chaves por compatibilidade
      const saved = localStorage.getItem('theme') || localStorage.getItem('vite-ui-theme');
      return (saved as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}