'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ScanDocument, formatBytes } from '@/db/database';
import { usePreferencesStore } from '@/store/preferencesStore';
import { 
  LayoutDashboard, 
  Scan, 
  FileText, 
  FileSpreadsheet, 
  Library, 
  Heart, 
  Database,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { username } = usePreferencesStore();
  
  // Live query documents from IndexedDB
  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  // Storage footprint estimates
  const [storageMB, setStorageMB] = useState('0.00');

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(({ usage }) => {
        setStorageMB(((usage || 0) / (1024 * 1024)).toFixed(2));
      });
    }
  }, [documents]);

  // Compute stats
  const totalDocs = documents.length;
  
  const totalPages = documents.reduce((sum, d) => sum + d.pages.length, 0);
  
  const ocrProcessedPages = documents.reduce((sum, d) => {
    return sum + d.pages.filter(p => p.ocrText).length;
  }, 0);

  // Take the 3 most recently updated documents
  const recentDocs = [...documents]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  // Generate dynamic activities based on document creation/update timestamps!
  const generateActivities = () => {
    const logs: { id: string; type: string; title: string; desc: string; date: Date; icon: React.ComponentType<any>; color: string }[] = [];

    documents.forEach(doc => {
      // Creation action
      logs.push({
        id: `create-${doc.id}`,
        type: 'create',
        title: 'Document Scanned',
        desc: `Created "${doc.name}" containing ${doc.pages.length} pages`,
        date: doc.createdAt,
        icon: Scan,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      });

      // OCR processed actions
      doc.pages.forEach((p, idx) => {
        if (p.ocrText) {
          logs.push({
            id: `ocr-${doc.id}-${p.id}`,
            type: 'ocr',
            title: 'OCR Text Extracted',
            desc: `Recognized language (${p.ocrLanguage?.toUpperCase() || 'ENG'}) on Page ${idx + 1} of "${doc.name}"`,
            date: doc.updatedAt,
            icon: FileText,
            color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          });
        }
      });

      // Favorite action
      if (doc.isFavorite) {
        logs.push({
          id: `fav-${doc.id}`,
          type: 'fav',
          title: 'Marked as Favorite',
          desc: `Bookmarked document "${doc.name}" in library`,
          date: doc.updatedAt,
          icon: Heart,
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        });
      }
    });

    // Sort logs chronologically, limit to top 5
    return logs
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  };

  const activities = generateActivities();

  return (
    <AppLayout>
      <div className="flex flex-col h-full max-w-6xl mx-auto p-6 space-y-8 select-none">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Welcome back, <span className="text-primary font-extrabold">{username}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Monitor your scanned paper repository and local OCR transcriptions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold bg-neutral-200/40 dark:bg-neutral-800/40 border border-border/20 px-3.5 py-2 rounded-xl text-muted-foreground uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            100% Private Offline Processing
          </div>
        </div>

        {/* STATISTICS CARDS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Total Scans', val: totalDocs, desc: 'Created documents', icon: Library, color: 'text-primary bg-primary/10' },
            { name: 'Total Pages', val: totalPages, desc: 'Individual page layers', icon: Scan, color: 'text-sky-500 bg-sky-500/10' },
            { name: 'OCR Transcriptions', val: ocrProcessedPages, desc: 'Text-extracted pages', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
            { name: 'Local Space Footprint', val: `${storageMB} MB`, desc: 'IndexedDB capacity', icon: Database, color: 'text-amber-500 bg-amber-500/10' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-card rounded-2xl border border-border/40 p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.name}
                </span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight leading-none mb-1">{stat.val}</p>
                <p className="text-[9px] font-bold text-muted-foreground leading-none">{stat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Quick Scanner */}
          <Link href="/scanner" className="group">
            <div className="bg-gradient-to-br from-primary/10 to-emerald-600/5 hover:from-primary/15 hover:to-emerald-600/10 rounded-2xl border border-primary/20 hover:border-primary/40 p-5 space-y-3 transition-all duration-200 hover:shadow-lg shadow-primary/5 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                <Scan className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1">
                  Launch Doc Scanner
                  <ChevronRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-relaxed">
                  Snap images, detect margins automatically, and warp perspective inside your browser.
                </p>
              </div>
            </div>
          </Link>

          {/* Quick OCR */}
          <Link href="/ocr" className="group">
            <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/5 hover:from-indigo-500/15 hover:to-blue-600/10 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 p-5 space-y-3 transition-all duration-200 hover:shadow-lg shadow-indigo-500/5 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1">
                  Text OCR Workspace
                  <ChevronRight className="h-3.5 w-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-relaxed">
                  Extract English and Indonesian languages using client-side OCR Tesseract engine.
                </p>
              </div>
            </div>
          </Link>

          {/* Quick PDF compiler */}
          <Link href="/pdf-generator" className="group">
            <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-600/5 hover:from-purple-500/15 hover:to-fuchsia-600/10 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 p-5 space-y-3 transition-all duration-200 hover:shadow-lg shadow-purple-500/5 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1">
                  Compile Multi-page PDF
                  <ChevronRight className="h-3.5 w-3.5 text-purple-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-relaxed">
                  Configure page limits, orientation layouts, margins, and download standard documents.
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* PRIMARY SPLITTER - RECENT FILES & TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Scans column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Recent Local Scans
              </span>
              {totalDocs > 3 && (
                <Link href="/library" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  See all library ({totalDocs})
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {recentDocs.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/40 p-10 text-center select-none flex flex-col items-center justify-center">
                <Library className="h-8 w-8 text-neutral-400 mb-4 animate-bounce" />
                <p className="text-xs font-semibold mb-1">Your library is empty</p>
                <p className="text-[10px] text-muted-foreground max-w-[220px]">
                  Scanned pages are saved inside your IndexedDB database automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recentDocs.map(doc => (
                  <div key={doc.id} className="bg-card rounded-2xl border border-border/40 p-3 space-y-3 group hover:border-border hover:shadow-md transition-all duration-200">
                    <div className="aspect-[3/4] w-full rounded-xl bg-neutral-200/10 dark:bg-neutral-950/20 overflow-hidden relative flex items-center justify-center border border-border/20">
                      {doc.pages[0] ? (
                        <img
                          src={URL.createObjectURL(doc.pages[0].enhancedImage)}
                          alt={doc.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                      
                      {doc.isFavorite && (
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/15 text-rose-500 backdrop-blur-[2px]">
                          <Heart className="h-3.5 w-3.5 fill-rose-500" />
                        </span>
                      )}
                      
                      <span className="absolute bottom-1.5 left-1.5 flex h-4.5 min-w-[16px] px-1 items-center justify-center rounded bg-neutral-900/65 text-[9px] font-bold text-white backdrop-blur-[2px]">
                        {doc.pages.length} Pages
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight pr-2">{doc.name}</p>
                      <p className="text-[9px] font-semibold text-muted-foreground mt-1">
                        Updated {doc.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline Column */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 select-none">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Local Activity Feed
            </span>

            <div className="bg-card rounded-2xl border border-border/40 p-5 space-y-4 shadow-sm min-h-[220px]">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                  <Calendar className="h-6 w-6 text-neutral-400 mb-2" />
                  <p className="text-[10px] font-bold">No activity logs recorded yet</p>
                </div>
              ) : (
                <div className="relative border-l border-border/40 pl-4 space-y-4 select-none">
                  {activities.map(act => (
                    <div key={act.id} className="relative">
                      {/* Left Dot Icon indicator */}
                      <span className={`absolute -left-[27px] top-0 flex h-[20px] w-[20px] items-center justify-center rounded-full border border-card shadow-sm ${act.color}`}>
                        <act.icon className="h-3 w-3" />
                      </span>

                      {/* Content descriptions */}
                      <div>
                        <p className="text-xs font-bold leading-none">{act.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-1 pr-2 font-medium">{act.desc}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 mt-1 leading-none">
                          <Clock className="h-3 w-3" />
                          {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
