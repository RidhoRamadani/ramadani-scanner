'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Scan, LayoutDashboard, Library, FileText, FileSpreadsheet, Settings } from 'lucide-react';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { username } = usePreferencesStore();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scanner', href: '/scanner', icon: Scan },
    { name: 'OCR Workspace', href: '/ocr', icon: FileText },
    { name: 'PDF Generator', href: '/pdf-generator', icon: FileSpreadsheet },
    { name: 'Document Library', href: '/library', icon: Library },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full md:hidden bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-3 select-none">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 shadow-sm shadow-primary/15">
            <Scan className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            SmansaScan<span className="text-primary font-bold">Pro</span>
          </span>
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click barrier */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 top-[53px] z-30 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide Down drawer Menu */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="absolute left-0 right-0 top-[53px] z-30 overflow-hidden bg-card border-b border-border shadow-xl px-4 py-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                      <div className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 border text-center transition-all ${
                        isActive 
                          ? 'bg-primary/10 border-primary text-primary font-semibold' 
                          : 'bg-neutral-200/10 border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                      }`}>
                        <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        <span className="text-xs font-medium">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* User indicator inside mobile menu */}
              <div className="flex items-center gap-3 rounded-xl p-3 bg-neutral-200/20 dark:bg-neutral-800/20 border border-border/20">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  {username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-none mb-1">{username}</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Local Account</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
