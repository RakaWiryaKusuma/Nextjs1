// hooks/useDarkMode.ts - DIPERBAIKI
'use client';
import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      // GUNAKAN KEY YANG SAMA: 'seija-dark-mode'
      const savedMode = localStorage.getItem('seija-dark-mode');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialMode = savedMode !== null ? savedMode === 'true' : systemPrefersDark;
      setDarkMode(initialMode);
      
      // Apply initial class
      if (initialMode) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (typeof window !== 'undefined') {
      // GUNAKAN KEY YANG SAMA: 'seija-dark-mode'
      localStorage.setItem('seija-dark-mode', newMode.toString());
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return { darkMode, toggleDarkMode, mounted };
}