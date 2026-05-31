'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { usePreferencesStore, type ScannerTheme, type PdfPageSize, type OcrLanguage } from '@/store/preferencesStore';
import { db } from '@/db/database';
import { 
  Settings, 
  User, 
  Sliders, 
  HardDrive, 
  Trash2, 
  Check, 
  Sun, 
  Moon, 
  Laptop, 
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    defaultPdfSize,
    setDefaultPdfSize,
    defaultOcrLang,
    setDefaultOcrLang,
    autoEdgeDetect,
    setAutoEdgeDetect,
    username,
    updateProfile
  } = usePreferencesStore();

  // Profile Editor state
  const [profileName, setProfileName] = useState(username);
  const [profileSaved, setProfileSaved] = useState(false);

  // Storage states
  const [storageUsage, setStorageUsage] = useState<number>(0); // in bytes
  const [storageQuota, setStorageQuota] = useState<number>(0); // in bytes
  const [isWiping, setIsWiping] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);

  // Query actual browser local sandbox storage estimates
  useEffect(() => {
    fetchStorageStats();
  }, []);

  const fetchStorageStats = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { usage, quota } = await navigator.storage.estimate();
        setStorageUsage(usage || 0);
        setStorageQuota(quota || 1); // prevent division by zero
      } catch (e) {
        console.error('Storage estimate unavailable', e);
      }
    }
  };

  const handleProfileSave = () => {
    if (!profileName.trim()) return;
    updateProfile(profileName.trim(), 'avatar_seed');
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleWipeDatabase = async () => {
    setIsWiping(true);
    try {
      // 1. Wipe IndexedDB table
      await db.documents.clear();
      // 2. Clear localStorage presets
      localStorage.removeItem('scanner-preferences');
      // 3. Reload window to restore clean defaults
      window.location.href = '/';
    } catch (e) {
      console.error('Database wipe failed', e);
      setIsWiping(false);
      setShowWipeModal(false);
    }
  };

  // Convert bytes to clean MB strings
  const toMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const usagePercent = Math.min(100, Math.max(0.1, (storageUsage / storageQuota) * 100));

  return (
    <AppLayout>
      <div className="flex flex-col h-full max-w-4xl mx-auto p-6 space-y-8 select-none">
        {/* Page Header */}
        <div className="flex items-center gap-2 border-b border-border/20 pb-4 shrink-0">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">Profile & Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT Column - Profile & UI Customizations */}
          <div className="space-y-8">
            {/* PROFILE SECTION */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-4 w-4" /> Personal Profile
              </span>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                    {profileName.substring(0, 2).toUpperCase() || 'SP'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Display Account Nickname
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-xl border border-border/40 bg-background/55 py-2 px-3 text-xs outline-none focus:border-primary transition-colors font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleProfileSave}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm active:scale-95"
                  >
                    {profileSaved ? <Check className="h-3.5 w-3.5" /> : null}
                    {profileSaved ? 'Profile Saved' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* PRESET ENGINE CONFS */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-4 w-4" /> Scanner Presets
              </span>

              {/* PDF Default size */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Default PDF Page Size
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                  {(['A4', 'LETTER', 'LEGAL'] as PdfPageSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setDefaultPdfSize(size)}
                      className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                        defaultPdfSize === size ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default OCR Dictionary language */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Default OCR Language
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                  <button
                    onClick={() => setDefaultOcrLang('eng')}
                    className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                      defaultOcrLang === 'eng' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    English (ENG)
                  </button>
                  <button
                    onClick={() => setDefaultOcrLang('ind')}
                    className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                      defaultOcrLang === 'ind' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Bahasa Indonesia (IND)
                  </button>
                </div>
              </div>

              {/* Auto edge toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-semibold">Auto Edge Detection</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Detect document bounds automatically on upload.</p>
                </div>
                <button
                  onClick={() => setAutoEdgeDetect(!autoEdgeDetect)}
                  className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none ${
                    autoEdgeDetect ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                >
                  <motion.div
                    layout
                    className="bg-card w-5 h-5 rounded-full shadow-sm"
                    animate={{ x: autoEdgeDetect ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT Column - Storage footprint, Theme Switch, database wipes */}
          <div className="space-y-8">
            {/* THEME SELECTOR */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-amber-500" /> UI Theme Styling
              </span>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { id: 'light', name: 'Light', icon: Sun, color: 'text-amber-500' },
                  { id: 'dark', name: 'Dark', icon: Moon, color: 'text-indigo-400' },
                  { id: 'system', name: 'System', icon: Laptop, color: 'text-muted-foreground' }
                ].map((t) => {
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as ScannerTheme)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 border text-center transition-all ${
                        active 
                          ? 'border-primary bg-primary/5 text-primary font-semibold' 
                          : 'border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                      }`}
                    >
                      <t.icon className={`h-4.5 w-4.5 ${t.color}`} />
                      <span className="text-[10px] font-bold">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STORAGE USAGE API */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4" /> Storage Allocation
                </span>
                <button 
                  onClick={fetchStorageStats}
                  className="rounded-lg p-1 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground transition-all"
                  title="Recalculate storage size"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-muted-foreground">IndexedDB Footprint</span>
                    <span>{toMB(storageUsage)} MB used</span>
                  </div>
                  
                  {/* Gauge indicator */}
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden relative">
                    <div 
                      style={{ width: `${usagePercent}%` }}
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full" 
                    />
                  </div>

                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold mt-1.5 uppercase tracking-wide">
                    <span>{toMB(storageUsage)} MB</span>
                    <span>Limit: {toMB(storageQuota)} MB</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  All scans, binary page blobs, and character dictionaries are stored fully offline on your own browser sandbox. Closing this tab or starting offline preserves all data.
                </p>
              </div>
            </div>

            {/* DESTRUCTIVE ACTION PURGE */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-rose-500" /> Danger Zone
              </span>

              <div className="space-y-4 pt-1">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Wiping this application database clears all scanned PDF pages, OCR transcriptions, and preferences saved locally inside IndexedDB.
                </p>

                <button
                  onClick={() => setShowWipeModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 py-2.5 text-xs font-bold transition-all shadow-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  Wipe App Database & Reset
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* DOUBLE CONFIRMATION RESET MODAL */}
        {showWipeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-semibold">Confirm Database Purge</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Are you absolutely sure? This will permanently delete all local IndexedDB records and restore the application to its fresh default out-of-the-box state. This action CANNOT be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowWipeModal(false)}
                  className="rounded-xl border border-border/40 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipeDatabase}
                  disabled={isWiping}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white py-2 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isWiping ? 'Wiping...' : 'Yes, WIPE Database'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
