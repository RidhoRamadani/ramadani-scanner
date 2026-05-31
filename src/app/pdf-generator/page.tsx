'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ScanDocument } from '@/db/database';
import AppLayout from '@/components/layout/AppLayout';
import { PDFDocument } from 'pdf-lib';
import { 
  FileSpreadsheet, 
  Settings, 
  Download, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Printer,
  FileCheck,
  Plus,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PdfGenerator() {
  // Query all documents
  const documents = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray(), []) ?? [];

  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER' | 'LEGAL'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<number>(18); // default narrow (18 points = 0.25 inch)
  
  // Compiler states
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const activeDoc = documents.find(d => d.id === selectedDocId);

  // Set default document selection
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Clean up Blob URLs when changed or unmounted
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Re-compile PDF whenever document selection or layout options change
  useEffect(() => {
    if (activeDoc && activeDoc.pages.length > 0) {
      compilePDF();
    } else {
      setPdfBlob(null);
      setPdfUrl('');
    }
  }, [selectedDocId, pageSize, orientation, margin]);

  // Compiles PDF fully client-side using PDF-lib
  const compilePDF = async () => {
    if (!activeDoc || activeDoc.pages.length === 0) return;

    setIsCompiling(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Standard page dimensions in points (72 points = 1 inch)
      const pageSizes = {
        A4: { width: 595.27, height: 841.89 },
        LETTER: { width: 612.0, height: 792.0 },
        LEGAL: { width: 612.0, height: 1008.0 }
      };

      const baseSize = pageSizes[pageSize];

      for (const page of activeDoc.pages) {
        // Fetch base64/arrayBuffer of the enhanced scan image
        const imgBuffer = await page.enhancedImage.arrayBuffer();
        
        // Embed Jpeg into pdfDoc
        const embeddedImage = await pdfDoc.embedJpg(imgBuffer);

        // Adjust dimensions depending on orientation
        let pageW = baseSize.width;
        let pageH = baseSize.height;
        if (orientation === 'landscape') {
          pageW = baseSize.height;
          pageH = baseSize.width;
        }

        const pdfPage = pdfDoc.addPage([pageW, pageH]);
        
        // Math coordinates calculation fitting images perfectly inside margins
        const availableW = pageW - margin * 2;
        const availableH = pageH - margin * 2;
        
        const imgW = embeddedImage.width;
        const imgH = embeddedImage.height;
        
        const scale = Math.min(availableW / imgW, availableH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        
        // Coordinates positioning centered
        const drawX = margin + (availableW - drawW) / 2;
        const drawY = margin + (availableH - drawH) / 2;

        pdfPage.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH
        });
      }

      // Save PDF output
      const pdfBytes = await pdfDoc.save();
      const compiledBlob = new Blob([pdfBytes] as any, { type: 'application/pdf' });
      
      setPdfBlob(compiledBlob);

      // Create new URL for embed preview
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(compiledBlob);
      setPdfUrl(url);

    } catch (e) {
      console.error('PDF Compile failed', e);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob || !activeDoc) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.name.replace(/\s+/g, '_')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full select-none">
        {/* Header Bar */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card px-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">Local PDF Generator</h1>
          </div>

          {pdfBlob && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
            >
              <Download className="h-3.5 w-3.5" />
              Download Compiled PDF
            </button>
          )}
        </div>

        {/* Compiler Workspace Splitter */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {documents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200/10 dark:bg-neutral-800/15 mb-6 text-muted-foreground">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <h2 className="text-base font-semibold mb-1">No documents to compile</h2>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                You must scan or upload a document inside the Scanner first before generating PDFs.
              </p>
              <Link
                href="/scanner"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
              >
                Go to Scanner
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* LEFT Column - Compiler Customizations Form */}
              <div className="w-full lg:w-80 shrink-0 bg-card border-r border-border/40 p-6 space-y-6 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" /> PDF Paper Preferences
                </span>

                {/* Select Document */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Select Document
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full rounded-xl border border-border/40 bg-background/55 py-2.5 px-3 text-xs outline-none focus:border-primary transition-colors"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.pages.length} Pages)</option>
                    ))}
                  </select>
                </div>

                {/* Page Format */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Page Size Format
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                    {(['A4', 'LETTER', 'LEGAL'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setPageSize(size)}
                        className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                          pageSize === size ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                        orientation === 'portrait' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                        orientation === 'landscape' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Margins (Border Padding)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                    {[
                      { name: 'None', val: 0 },
                      { name: 'Narrow', val: 18 },
                      { name: 'Normal', val: 36 }
                    ].map(m => (
                      <button
                        key={m.name}
                        onClick={() => setMargin(m.val)}
                        className={`py-1.5 rounded-md font-semibold transition-all text-center ${
                          margin === m.val ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* visual statistics indicators */}
                {activeDoc && (
                  <div className="border-t border-border/20 pt-6 space-y-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Document Name</span>
                      <span className="truncate max-w-[140px]">{activeDoc.name}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Total Scans</span>
                      <span>{activeDoc.pages.length} Pages</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Local footprint</span>
                      <span>{(activeDoc.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT Column - Live PDF IFrame Viewport Viewer */}
              <div className="flex-1 flex flex-col overflow-hidden bg-neutral-100/35 dark:bg-neutral-950/20 p-6 relative">
                {isCompiling ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-xs font-semibold animate-pulse">Compiling PDF on-device...</p>
                    <p className="text-[10px] text-muted-foreground mt-1">This uses PDF-lib fully client-side</p>
                  </div>
                ) : pdfUrl ? (
                  <div className="flex-1 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-border/20 bg-card relative">
                    {/* Native interactive Browser Frame */}
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-0 focus:outline-none"
                      title="PDF preview layout"
                    />

                    {/* Fallback floating button inside mobile to preview */}
                    <div className="absolute bottom-4 right-4 md:hidden z-10 flex gap-2">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-neutral-950/90 text-white border border-white/10 px-4 py-2.5 text-xs font-semibold backdrop-blur-md shadow-lg"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview Fullscreen
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <FileCheck className="h-8 w-8 text-neutral-400 mb-4" />
                    <p className="text-xs font-semibold">Error rendering PDF layout</p>
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
