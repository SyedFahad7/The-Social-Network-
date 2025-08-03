'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light'); // Changed from 'system' to 'light'
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [themeLoaded, setThemeLoaded] = useState(false);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    // Save theme to localStorage
    localStorage.setItem('theme', theme);

    // Apply theme to document with smooth transition
    const root = document.documentElement;
    
    // Add transition class before changing theme
    root.classList.add('theme-transition');
    
    if (theme === 'system') {
      const systemTheme = prefersDark ? 'dark' : 'light';
      setResolvedTheme(systemTheme);
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      setResolvedTheme(theme);
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    
    // Remove transition class after theme change is complete
    const transitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(transitionTimeout);
  }, [theme, themeLoaded, prefersDark]);

  // Handle initial theme setup
  useEffect(() => {
    // Apply initial theme based on saved preference or default to light
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      // Use saved theme
      document.documentElement.classList.remove('dark', 'light');
      if (savedTheme === 'system') {
        const initialSystemTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.classList.add(initialSystemTheme);
      } else {
        document.documentElement.classList.add(savedTheme);
      }
    } else {
      // Default to light theme
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light'); // Changed from 'system' to 'light'
    }
  }, [prefersDark]);

  // Don't render children until theme is loaded
  if (!themeLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}