'use client';

import React, { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferencesStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  // Prevent flash by matching standard dark background on initial client render
  if (!mounted) {
    return <div className="min-h-screen bg-[#09090b] text-[#fafafa]">{children}</div>;
  }

  return <>{children}</>;
}
