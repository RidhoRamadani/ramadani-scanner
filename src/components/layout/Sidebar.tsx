'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { usePreferencesStore } from '@/store/preferencesStore';
import { 
  Scan, 
  LayoutDashboard, 
  Library, 
  FileText, 
  FileSpreadsheet, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string | number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme, username } = usePreferencesStore();

  // Live count of documents stored in IndexedDB
  const docCount = useLiveQuery(
    async () => {
      return await db.documents.count();
    },
    []
  ) ?? 0;

  // Let's identify OCR-processed page counts or PDF compilations
  const processedStats = useLiveQuery(
    async () => {
      const docs = await db.documents.toArray();
      let ocrCount = 0;
      docs.forEach(d => {
        d.pages.forEach(p => {
          if (p.ocrText) ocrCount++;
        });
      });
      return ocrCount;
    },
    []
  ) ?? 0;

  // Navigation Items
  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scanner', href: '/scanner', icon: Scan },
    { name: 'OCR Workspace', href: '/ocr', icon: FileText, badge: processedStats > 0 ? processedStats : undefined },
    { name: 'PDF Generator', href: '/pdf-generator', icon: FileSpreadsheet },
    { name: 'Document Library', href: '/library', icon: Library, badge: docCount > 0 ? docCount : undefined },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const handleThemeCycle = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-30 hidden h-screen flex-col border-r border-border/40 bg-card/65 backdrop-blur-xl md:flex shrink-0 select-none overflow-hidden"
    >
      {/* Upper Logo / Branding */}
      <div className="flex h-16 items-center px-6 justify-between border-b border-border/20">
        <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-md shadow-primary/20">
            <Scan className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
            >
              CamScan<span className="text-primary font-bold">Pro</span>
            </motion.span>
          )}
        </Link>

        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse Handle button (when collapsed) */}
      {isCollapsed && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className="relative block">
              <div
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all group ${
                  isActive
                    ? 'text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                }`}
              >
                {/* Background highlight pill for active items */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 z-0 rounded-xl bg-gradient-to-r from-primary to-emerald-600 shadow-sm shadow-primary/10"
                  />
                )}

                {/* Icon wrapper */}
                <span className="relative z-10">
                  <item.icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                </span>

                {/* Text name */}
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 flex-1 truncate"
                  >
                    {item.name}
                  </motion.span>
                )}

                {/* Optional notifications/stats badges */}
                {!isCollapsed && item.badge !== undefined && (
                  <span className={`relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggler & Profile Section */}
      <div className="border-t border-border/20 px-3 py-4 space-y-3">
        {/* Theme cycling button */}
        <button
          onClick={handleThemeCycle}
          className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30 transition-colors"
        >
          <span className="relative">
            {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
            {theme === 'dark' && <Moon className="h-5 w-5 text-indigo-400" />}
            {theme === 'system' && <Laptop className="h-5 w-5" />}
          </span>
          {!isCollapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 text-left capitalize truncate">
              Theme: {theme}
            </motion.span>
          )}
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 rounded-xl p-2 bg-neutral-200/20 dark:bg-neutral-800/20 border border-border/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-sm tracking-wider">
            {username.substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-none mb-0.5">{username}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-none">Local Account</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
