'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ScanDocument, type DocumentPage } from '@/db/database';
import AppLayout from '@/components/layout/AppLayout';
import Tesseract from 'tesseract.js';
import { 
  FileText, 
  Languages, 
  Copy, 
  Download, 
  Save, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function OcrWorkspace() {
  // Query all local documents from IndexedDB
  const documents = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray(), []) ?? [];

  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [ocrLang, setOcrLang] = useState<'eng' | 'ind'>('eng');
  
  // OCR processing states
  const [isRunning, setIsRunning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('Idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  
  // OCR output editor states
  const [recognizedText, setRecognizedText] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const activeDoc = documents.find(d => d.id === selectedDocId);
  const activePage = activeDoc?.pages[selectedPageIndex];

  // Set default document if none is selected and list loaded
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Load existing OCR text when page index transitions
  useEffect(() => {
    if (activePage) {
      setRecognizedText(activePage.ocrText || '');
      setConfidenceScore(activePage.ocrConfidence || null);
    }
  }, [selectedPageIndex, selectedDocId, activeDoc]);

  // Performs actual OCR in browser
  const handleStartOcr = async () => {
    if (!activePage) return;

    setIsRunning(true);
    setOcrProgress(0);
    setOcrStatus('Initializing OCR Engine...');

    try {
      // 1. Create a dynamic blob object URL for Tesseract
      const url = URL.createObjectURL(activePage.enhancedImage);

      // 2. Trigger Tesseract recognition call
      const result = await Tesseract.recognize(
        url,
        ocrLang,
        {
          logger: (m) => {
            if (m.status === 'loading tesseract api') {
              setOcrStatus('Loading API...');
            } else if (m.status === 'loading language traineddata') {
              setOcrStatus('Downloading language models...');
            } else if (m.status === 'initializing api') {
              setOcrStatus('Initializing OCR dictionaries...');
            } else if (m.status === 'recognizing text') {
              setOcrStatus('Extracting characters...');
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      // 3. Update local states
      const text = result.data.text;
      const confidence = result.data.confidence; // percentage 0-100
      
      setRecognizedText(text);
      setConfidenceScore(confidence);
      setOcrStatus('Completed');
      URL.revokeObjectURL(url);

      // 4. Update the page's OCR data inside local IndexedDB immediately!
      await saveOcrToDB(text, confidence);

    } catch (error) {
      console.error('OCR failed', error);
      setOcrStatus('Failed to read document');
    } finally {
      setIsRunning(false);
    }
  };

  // Writes OCR results back to our Dexie store
  const saveOcrToDB = async (text: string, confidence: number) => {
    if (!activeDoc || !activePage) return;
    setIsSaving(true);
    try {
      const updatedPages = activeDoc.pages.map((p, idx) => 
        idx === selectedPageIndex
          ? { ...p, ocrText: text, ocrConfidence: confidence, ocrLanguage: ocrLang }
          : p
      );

      await db.documents.update(activeDoc.id, {
        pages: updatedPages,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Failed to save OCR to DB', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (confidenceScore !== null) {
      await saveOcrToDB(recognizedText, confidenceScore);
    } else {
      await saveOcrToDB(recognizedText, 100); // assume 100 if manually written
    }
  };

  const handleCopyToClipboard = () => {
    if (!recognizedText) return;
    navigator.clipboard.writeText(recognizedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!recognizedText || !activeDoc) return;
    const blob = new Blob([recognizedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.name.replace(/\s+/g, '_')}_Page_${selectedPageIndex + 1}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Determine colors of the confidence score badge
  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full select-none">
        {/* Page Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card px-6">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">Local OCR Workspace</h1>
          </div>

          {activeDoc && (
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-neutral-200/40 dark:bg-neutral-800/40 text-xs">
                <button
                  onClick={() => setOcrLang('eng')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    ocrLang === 'eng' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  English (ENG)
                </button>
                <button
                  onClick={() => setOcrLang('ind')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    ocrLang === 'ind' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  Bahasa (IND)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* If there are no documents in library yet */}
          {documents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200/10 dark:bg-neutral-800/15 mb-6 text-muted-foreground">
                <FileText className="h-7 w-7" />
              </div>
              <h2 className="text-base font-semibold mb-1">No scanned documents yet</h2>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                You must scan or upload a document using the Scanner first before extracting local text.
              </p>
              <Link
                href="/scanner"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                Go to Scanner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* LEFT Column - Document selector & Image Preview */}
              <div className="flex-1 flex flex-col border-r border-border/40 overflow-hidden bg-neutral-100/35 dark:bg-neutral-900/10">
                {/* Selector Header Bar */}
                <div className="p-4 bg-card border-b border-border/20 flex flex-col sm:flex-row gap-3">
                  {/* Select Document */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Select local document
                    </label>
                    <select
                      value={selectedDocId}
                      onChange={(e) => {
                        setSelectedDocId(e.target.value);
                        setSelectedPageIndex(0);
                      }}
                      className="w-full rounded-xl border border-border/40 bg-background/55 py-2 px-3 text-xs outline-none focus:border-primary transition-colors"
                    >
                      {documents.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.pages.length} Pages)</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Page Index */}
                  {activeDoc && activeDoc.pages.length > 1 && (
                    <div className="w-full sm:w-36">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Select Page
                      </label>
                      <select
                        value={selectedPageIndex}
                        onChange={(e) => setSelectedPageIndex(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-border/40 bg-background/55 py-2 px-3 text-xs outline-none focus:border-primary transition-colors"
                      >
                        {activeDoc.pages.map((_, idx) => (
                          <option key={idx} value={idx}>Page {idx + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Page Image Viewport */}
                <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                  {activePage ? (
                    <div className="max-h-[60vh] relative flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(activePage.enhancedImage)}
                        alt="OCR source scan"
                        className="max-h-[50vh] rounded-lg shadow-2xl border border-border/10"
                      />

                      {/* Loading Ring overlay */}
                      {isRunning && (
                        <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-[2px] z-10 p-6 text-center select-none">
                          <div className="relative flex items-center justify-center mb-4">
                            {/* Spinning Ring */}
                            <svg className="w-16 h-16 transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="4"
                                fill="transparent"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="var(--primary)"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={175}
                                strokeDashoffset={175 - (175 * ocrProgress) / 100}
                                className="transition-all duration-300"
                              />
                            </svg>
                            <span className="absolute text-xs font-bold">{ocrProgress}%</span>
                          </div>
                          <p className="text-xs font-semibold tracking-wide animate-pulse">{ocrStatus}</p>
                          <p className="text-[10px] text-white/60 mt-1">This runs fully in-browser offline</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center gap-1">
                      <HelpCircle className="h-8 w-8 text-neutral-400" />
                      <p className="text-xs font-semibold mt-2">Error loading page image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT Column - OCR Output Workspace (Notion Style editor) */}
              <div className="w-full md:w-[450px] shrink-0 flex flex-col bg-card overflow-hidden">
                {/* Editor Header Bar */}
                <div className="p-4 border-b border-border/20 flex items-center justify-between shrink-0 bg-neutral-200/5 dark:bg-neutral-900/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Extracted Text Editor
                  </span>

                  {confidenceScore !== null && (
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 ${getConfidenceBadgeColor(confidenceScore)}`}>
                      <Sparkles className="h-3 w-3" />
                      {confidenceScore}% Match
                    </span>
                  )}
                </div>

                {/* Main Text Editor Workspace */}
                <div className="flex-1 p-5 overflow-y-auto flex flex-col">
                  {recognizedText ? (
                    <textarea
                      value={recognizedText}
                      onChange={(e) => setRecognizedText(e.target.value)}
                      placeholder="Write OCR output..."
                      className="flex-1 w-full bg-transparent resize-none border-0 p-0 text-sm leading-relaxed outline-none focus:ring-0 font-sans tracking-wide text-foreground/90 font-medium"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-neutral-100/10 dark:bg-neutral-800/10 border border-dashed border-border/40 rounded-xl">
                      <FileText className="h-9 w-9 text-neutral-400 mb-4" />
                      <h3 className="text-xs font-semibold mb-1">No OCR data extracted</h3>
                      <p className="text-[10px] text-muted-foreground max-w-[200px] mb-5">
                        Start the OCR scanner engine below to analyze character layouts on this page.
                      </p>
                      <button
                        onClick={handleStartOcr}
                        disabled={isRunning}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 transition-transform active:scale-95"
                      >
                        <Sparkles className="h-3.5 w-3.5 animate-bounce" />
                        Run OCR Engine
                      </button>
                    </div>
                  )}
                </div>

                {/* Editor Action Bottom Bar */}
                {recognizedText && (
                  <div className="p-4 border-t border-border/20 flex items-center justify-between shrink-0 bg-neutral-200/5 dark:bg-neutral-900/10">
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30 transition-colors"
                        title="Copy to Clipboard"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleDownloadTxt}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30 transition-colors"
                        title="Download as TXT file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleStartOcr}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-all active:scale-95"
                      >
                        Re-run OCR
                      </button>

                      <button
                        onClick={handleManualSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? 'Saving...' : 'Save Text'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
