'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ScanDocument, formatBytes } from '@/db/database';
import AppLayout from '@/components/layout/AppLayout';
import { usePreferencesStore } from '@/store/preferencesStore';
import { PDFDocument } from 'pdf-lib';
import { 
  Library, 
  Search, 
  LayoutGrid, 
  List, 
  Heart, 
  Trash2, 
  Edit3, 
  Download, 
  Calendar, 
  HardDrive, 
  FileText,
  FileSpreadsheet,
  Check,
  ChevronRight,
  MoreVertical,
  X,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentLibrary() {
  const { libraryViewMode, setLibraryViewMode } = usePreferencesStore();
  
  // Live query all documents from IndexedDB
  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  // Library states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'size-desc'>('date-desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Interactive action modals
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Preview blobs URLs for grid cards
  const [docThumbnails, setDocThumbnails] = useState<Record<string, string>>({});

  // Generate thumbnail URL mappings from the first page of each document
  useEffect(() => {
    const urls: Record<string, string> = {};
    documents.forEach(doc => {
      if (doc.pages[0]) {
        urls[doc.id] = URL.createObjectURL(doc.pages[0].enhancedImage);
      }
    });
    setDocThumbnails(urls);

    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [documents]);

  const toggleFavorite = async (id: string, isFav: boolean) => {
    await db.documents.update(id, { isFavorite: !isFav });
  };

  const handleRename = async () => {
    if (!editingDocId || !newName.trim()) return;
    await db.documents.update(editingDocId, { 
      name: newName.trim(),
      updatedAt: new Date()
    });
    setEditingDocId(null);
    setNewName('');
  };

  const handleDelete = async () => {
    if (!deletingDocId) return;
    await db.documents.delete(deletingDocId);
    setDeletingDocId(null);
  };

  const handleDownloadPdf = async (doc: ScanDocument) => {
    if (doc.pages.length === 0) return;
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const page of doc.pages) {
        const imgBuffer = await page.enhancedImage.arrayBuffer();
        const embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        
        // Match standard A4 dimensions
        const pageW = 595.27;
        const pageH = 841.89;
        const pdfPage = pdfDoc.addPage([pageW, pageH]);
        
        // Scale image to page bounds
        const scale = Math.min(pageW / embeddedImage.width, pageH / embeddedImage.height);
        const w = embeddedImage.width * scale;
        const h = embeddedImage.height * scale;
        
        pdfPage.drawImage(embeddedImage, {
          x: (pageW - w) / 2,
          y: (pageH - h) / 2,
          width: w,
          height: h
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes] as any, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to compile PDF', e);
    }
  };

  // Perform full-text searching over title names AND OCR recognized text!
  const filteredAndSortedDocs = documents
    .filter(doc => {
      const matchSearch = 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.pages.some(p => p.ocrText?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchFav = showFavoritesOnly ? doc.isFavorite : true;
      
      return matchSearch && matchFav;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sortBy === 'date-asc') return a.updatedAt.getTime() - b.updatedAt.getTime();
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
      return 0;
    });

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card px-6">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">Document Library</h1>
          </div>

          <Link
            href="/scanner"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Scan New Document
          </Link>
        </div>

        {/* Toolbar & Filter Panels */}
        <div className="p-6 bg-neutral-200/10 dark:bg-neutral-900/5 border-b border-border/30 flex flex-col md:flex-row gap-4 justify-between items-center select-none">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search document name or OCR text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background py-2.5 pl-10 pr-4 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Sorting Select */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-border/40 bg-background py-2.5 px-3 text-xs outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="date-desc">Newest Scans</option>
              <option value="date-asc">Oldest Scans</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="size-desc">Largest Size</option>
            </select>

            {/* Favorite Filter Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1.5 rounded-xl border py-2.5 px-4 text-xs font-semibold transition-all ${
                showFavoritesOnly
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                  : 'border-border/40 bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-rose-500' : ''}`} />
              Favorites
            </button>

            {/* Grid/List View switch */}
            <div className="flex items-center p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
              <button
                onClick={() => setLibraryViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  libraryViewMode === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLibraryViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  libraryViewMode === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Library Lists scroll area */}
        <div className="flex-1 p-6 overflow-y-auto bg-neutral-100/35 dark:bg-neutral-900/10">
          {filteredAndSortedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200/10 dark:bg-neutral-800/15 mb-6 text-muted-foreground">
                <Library className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold mb-1">No matches found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                We couldn&apos;t find any documents matching your active searches or filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowFavoritesOnly(false);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : libraryViewMode === 'grid' ? (
            /* GRID VIEW LAYOUT */
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredAndSortedDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex flex-col bg-card rounded-2xl border border-border/40 hover:border-border overflow-hidden transition-all duration-200 hover:shadow-lg shadow-neutral-200/30 dark:shadow-none"
                  >
                    {/* Visual Card preview */}
                    <div className="aspect-[3/4] bg-neutral-200/10 dark:bg-neutral-950/20 overflow-hidden relative flex items-center justify-center border-b border-border/20 p-2">
                      {docThumbnails[doc.id] ? (
                        <img
                          src={docThumbnails[doc.id]}
                          alt={doc.name}
                          className="h-full w-full object-contain transition-transform group-hover:scale-102"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}

                      {/* Floating actions menu */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-950/80 p-1.5 rounded-xl backdrop-blur-[2px] z-10">
                        <button
                          onClick={() => toggleFavorite(doc.id, doc.isFavorite)}
                          className="p-1 hover:bg-white/10 rounded-lg text-white"
                          title="Favorite"
                        >
                          <Heart className={`h-4.5 w-4.5 ${doc.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDocId(doc.id);
                            setNewName(doc.name);
                          }}
                          className="p-1 hover:bg-white/10 rounded-lg text-white"
                          title="Rename"
                        >
                          <Edit3 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDocId(doc.id)}
                          className="p-1 hover:bg-rose-500/80 rounded-lg text-white"
                          title="Delete"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {/* Floating page counter */}
                      <span className="absolute bottom-2 left-2 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-md bg-neutral-900/65 text-[10px] font-bold text-white backdrop-blur-[2px]">
                        {doc.pages.length} Pages
                      </span>
                    </div>

                    {/* Metadata contents */}
                    <div className="p-4 space-y-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate pr-6 group-hover:text-primary transition-colors leading-snug">
                          {doc.name}
                        </h4>
                      </div>

                      {/* File footers details */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {doc.updatedAt.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5" />
                          {formatBytes(doc.sizeBytes)}
                        </span>
                      </div>

                      {/* Quick export actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/20">
                        <button
                          onClick={() => handleDownloadPdf(doc)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Download className="h-3 w-3 text-primary" />
                          PDF
                        </button>
                        <Link
                          href={`/ocr?docId=${doc.id}`}
                          className="flex items-center justify-center gap-1 rounded-lg border border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all"
                        >
                          <FileText className="h-3 w-3 text-indigo-500" />
                          OCR
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* LIST VIEW LAYOUT */
            <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-neutral-200/10 dark:bg-neutral-900/5 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4 w-12"></th>
                    <th className="p-4">Document Name</th>
                    <th className="p-4 w-24">Pages</th>
                    <th className="p-4 w-32">Footprint Size</th>
                    <th className="p-4 w-36">Last Scanned</th>
                    <th className="p-4 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedDocs.map((doc) => (
                    <tr 
                      key={doc.id}
                      className="border-b border-border/30 last:border-0 hover:bg-neutral-200/10 dark:hover:bg-neutral-800/20 transition-all font-semibold"
                    >
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleFavorite(doc.id, doc.isFavorite)}
                          className="text-muted-foreground hover:text-rose-500 transition-colors"
                        >
                          <Heart className={`h-4.5 w-4.5 ${doc.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </td>
                      <td className="p-4 truncate max-w-xs pr-6">
                        <span className="text-foreground hover:text-primary transition-colors block leading-snug">
                          {doc.name}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{doc.pages.length} Pages</td>
                      <td className="p-4 text-muted-foreground">{formatBytes(doc.sizeBytes)}</td>
                      <td className="p-4 text-muted-foreground">{doc.updatedAt.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleDownloadPdf(doc)}
                            className="p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg text-primary"
                            title="Export PDF"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDocId(doc.id);
                              setNewName(doc.name);
                            }}
                            className="p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Rename"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDocId(doc.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL - RENAME DOCUMENT */}
        {editingDocId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Rename Document</h3>
                <button onClick={() => setEditingDocId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-background/55 py-2.5 px-3.5 text-xs outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingDocId(null)}
                  className="rounded-xl border border-border/40 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 py-2 px-4 text-xs font-semibold shadow-sm"
                >
                  Save Rename
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL - SAFETY DELETE WARNING */}
        {deletingDocId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-semibold text-rose-500">Delete document?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This action is irreversible. All raw pages and OCR results stored locally inside your IndexedDB database will be permanently wiped.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingDocId(null)}
                  className="rounded-xl border border-border/40 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white py-2 px-4 text-xs font-semibold shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
