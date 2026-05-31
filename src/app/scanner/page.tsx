'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import UploadArea from '@/components/scanner/UploadArea';
import CropViewer from '@/components/scanner/CropViewer';
import ImageEnhancer from '@/components/scanner/ImageEnhancer';
import { useScannerStore } from '@/store/scannerStore';
import { warpPerspective, applyImageEnhancements, loadImageElement } from '@/utils/imageProcessor';
import {
  Plus,
  Trash2,
  RotateCw,
  RotateCcw,
  Save,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Crop,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export default function ScannerPage() {
  const router = useRouter();
  const {
    currentDocument,
    selectedPageIndex,
    isProcessing,
    startNewDocument,
    addPage,
    updatePageCorners,
    updatePageFilters,
    updatePageProcessedImages,
    deletePage,
    setSelectedPageIndex,
    setProcessing,
    saveDocument,
    resetScanner,
  } = useScannerStore();

  const [activeTab, setActiveTab] = useState<'crop' | 'filters'>('crop');
  const [docName, setDocName] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoomScale, setZoomScale] = useState(1);
  // Mobile: show/hide the bottom page strip
  const [showMobileStrip, setShowMobileStrip] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);

  const addPageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentDocument) {
      startNewDocument('');
    }
  }, [currentDocument]);

  useEffect(() => {
    if (!currentDocument) return;

    const urls: Record<string, string> = {};
    currentDocument.pages.forEach((p) => {
      urls[p.id] = URL.createObjectURL(p.enhancedImage);
    });
    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [currentDocument?.pages]);

  // Scroll selected page into view in mobile strip
  useEffect(() => {
    if (!stripRef.current) return;
    const selected = stripRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedPageIndex]);

  const activePage = currentDocument?.pages[selectedPageIndex];

  const defaultCorners = [
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ];

  const runPerspectiveWarp = async (cornersList = activePage?.corners) => {
    if (!currentDocument || !activePage || !cornersList) return;
    setProcessing(true);
    try {
      const warpedBlob = await warpPerspective(activePage.originalImage, cornersList);
      const enhancedBlob = await applyImageEnhancements(warpedBlob, activePage.filters);
      updatePageProcessedImages(activePage.id, warpedBlob, enhancedBlob);
    } catch (e) {
      console.error('Warp perspective failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterUpdate = async (filterChange: any) => {
    if (!currentDocument || !activePage) return;
    updatePageFilters(activePage.id, filterChange);
    setProcessing(true);
    try {
      const mergedFilters = { ...activePage.filters, ...filterChange };
      const enhancedBlob = await applyImageEnhancements(activePage.croppedImage, mergedFilters);
      updatePageProcessedImages(activePage.id, activePage.croppedImage, enhancedBlob);
    } catch (e) {
      console.error('Filters failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleCropSave = (newCorners: any) => {
    if (!activePage) return;
    updatePageCorners(activePage.id, newCorners);
    runPerspectiveWarp(newCorners);
  };

  const handleRotate = async (direction: 'left' | 'right') => {
    if (!activePage) return;
    setProcessing(true);
    try {
      const img = await loadImageElement(activePage.originalImage);
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (direction === 'right') {
        ctx.translate(canvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else {
        ctx.translate(0, canvas.height);
        ctx.rotate((-90 * Math.PI) / 180);
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (rotatedBlob) => {
        if (!rotatedBlob) return;
        const warpedBlob = await warpPerspective(rotatedBlob, defaultCorners);
        const enhancedBlob = await applyImageEnhancements(warpedBlob, activePage.filters);
        updatePageCorners(activePage.id, defaultCorners);
        const store = useScannerStore.getState();
        if (store.currentDocument) {
          const updatedPages = store.currentDocument.pages.map((page) =>
            page.id === activePage.id
              ? { ...page, originalImage: rotatedBlob, croppedImage: warpedBlob, enhancedImage: enhancedBlob }
              : page
          );
          useScannerStore.setState({
            currentDocument: { ...store.currentDocument, pages: updatedPages, updatedAt: new Date() },
          });
        }
        setProcessing(false);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error('Rotation failed', e);
      setProcessing(false);
    }
  };

  // Accepts File[] — used by UploadArea
  const handleImagesUploaded = async (files: File[]) => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      for (const file of files) {
        const pageId = await addPage(file);
        const warpedBlob = await warpPerspective(file, defaultCorners);
        const enhancedBlob = await applyImageEnhancements(warpedBlob, {
          type: 'original',
          brightness: 0,
          contrast: 0,
        });
        updatePageProcessedImages(pageId, warpedBlob, enhancedBlob);
      }
    } catch (e) {
      console.error('Upload handling failed', e);
    } finally {
      setProcessing(false);
    }
  };

  // Used by "Add Page" button — wraps single file in array
  const handleAddPageFile = (file: File) => handleImagesUploaded([file]);

  const handleSave = async () => {
    if (!currentDocument || currentDocument.pages.length === 0) return;
    setProcessing(true);
    try {
      const store = useScannerStore.getState();
      if (store.currentDocument && docName) {
        store.currentDocument.name = docName;
      }
      await saveDocument();
      resetScanner();
      router.push('/library');
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    if (!currentDocument) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentDocument.pages.length) return;
    const pagesCopy = [...currentDocument.pages];
    const [moved] = pagesCopy.splice(index, 1);
    pagesCopy.splice(targetIdx, 0, moved);
    useScannerStore.setState({
      currentDocument: { ...currentDocument, pages: pagesCopy, updatedAt: new Date() },
      selectedPageIndex: targetIdx,
    });
  };

  const hasPages = currentDocument && currentDocument.pages.length > 0;

  return (
    <AppLayout>
      {/* Hidden input for "Add Page" */}
      <input
        ref={addPageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleAddPageFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      <div className="flex flex-col h-full">
        {/* ── Top Header ── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-card px-3 sm:px-6 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => { resetScanner(); router.push('/dashboard'); }}
              className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder={currentDocument?.name || 'Untitled Scan'}
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-border focus:border-primary text-sm font-semibold py-0.5 px-1 outline-none transition-colors min-w-0 w-full max-w-[160px] sm:max-w-xs truncate"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasPages && (
              <>
                {/* Mobile: icon-only save */}
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="sm:hidden flex items-center justify-center rounded-xl bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/10"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
                {/* Desktop: full save button */}
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-all shadow-md shadow-primary/10"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save ({currentDocument.pages.length} pages)
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* LEFT Sidebar — desktop only */}
          {hasPages && (
            <div className="hidden sm:flex w-52 shrink-0 border-r border-border/40 bg-card/40 flex-col overflow-hidden p-3 gap-3 select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pages</span>
                <span className="text-xs font-semibold text-primary">
                  {selectedPageIndex + 1} / {currentDocument.pages.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                {currentDocument.pages.map((p, idx) => {
                  const selected = selectedPageIndex === idx;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPageIndex(idx)}
                      className={`group relative rounded-xl border p-1.5 cursor-pointer transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                      }`}
                    >
                      <div className="aspect-[3/4] w-full rounded-lg bg-neutral-200/10 dark:bg-neutral-800/10 overflow-hidden relative flex items-center justify-center">
                        {previewUrls[p.id] ? (
                          <img src={previewUrls[p.id]} alt={`Page ${idx + 1}`} className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        )}
                        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded bg-black/60 text-[9px] font-bold text-white">
                          {idx + 1}
                        </span>
                      </div>
                      {/* Hover controls */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 p-0.5 rounded-md z-10">
                        {idx > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); movePage(idx, 'up'); }} className="p-0.5 hover:bg-white/10 rounded text-white">
                            <ChevronUp className="h-3 w-3" />
                          </button>
                        )}
                        {idx < currentDocument.pages.length - 1 && (
                          <button onClick={(e) => { e.stopPropagation(); movePage(idx, 'down'); }} className="p-0.5 hover:bg-white/10 rounded text-white">
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deletePage(p.id); }} className="p-0.5 hover:bg-rose-500/80 rounded text-white">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addPageInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 py-3 text-xs font-semibold text-muted-foreground hover:text-primary transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Add Page
              </button>
            </div>
          )}

          {/* ── MAIN Workbench ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Empty state */}
            {!hasPages ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-neutral-100/35 dark:bg-neutral-900/10">
                <UploadArea onImagesSelected={handleImagesUploaded} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

                {/* Center canvas area */}
                <div className="flex-1 flex flex-col overflow-hidden relative border-b lg:border-b-0 lg:border-r border-border/40 min-h-0">

                  {/* Toolbar */}
                  <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/20 px-3 sm:px-4 bg-card/60 select-none gap-2">
                    {/* Tabs */}
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                      <button
                        onClick={() => setActiveTab('crop')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                          activeTab === 'crop' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Crop className="h-3 w-3" />
                        <span className="hidden xs:inline">Crop</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                          activeTab === 'filters' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Layers className="h-3 w-3" />
                        <span className="hidden xs:inline">Filters</span>
                      </button>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1">
                      {isProcessing && (
                        <span className="text-[10px] font-semibold text-primary animate-pulse flex items-center gap-1 mr-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                          <span className="hidden sm:inline">Processing...</span>
                        </span>
                      )}
                      <button
                        onClick={() => handleRotate('left')}
                        disabled={isProcessing}
                        className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Rotate CCW"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRotate('right')}
                        disabled={isProcessing}
                        className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Rotate CW"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      {/* Mobile: delete active page */}
                      <button
                        onClick={() => { if (activePage) deletePage(activePage.id); }}
                        className="sm:hidden rounded-lg p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Canvas viewport */}
                  <div className="flex-1 relative overflow-hidden bg-neutral-900/5 dark:bg-neutral-950/20 min-h-0">
                    {activePage && (
                      <div className="absolute inset-0">
                        {activeTab === 'crop' ? (
                          <CropViewer
                            pageId={activePage.id}
                            originalImage={activePage.originalImage}
                            corners={activePage.corners}
                            onCropSave={handleCropSave}
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center p-4 select-none relative">
                            {isProcessing && (
                              <div className="absolute left-[15%] right-[15%] top-4 bottom-4 z-20 pointer-events-none rounded-lg overflow-hidden border border-primary/20">
                                <div className="laser-line" />
                              </div>
                            )}
                            <div className="max-h-[55vh] max-w-full relative flex items-center justify-center">
                              {previewUrls[activePage.id] ? (
                                <img
                                  style={{ transform: `scale(${zoomScale})` }}
                                  src={previewUrls[activePage.id]}
                                  alt="Enhanced output"
                                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                              )}
                            </div>
                            {/* Zoom control */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/85 border border-border/20 backdrop-blur-md shadow-sm text-xs font-semibold">
                              <button onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))} className="hover:text-primary transition-colors w-5 text-center">-</button>
                              <span className="min-w-[36px] text-center">{Math.round(zoomScale * 100)}%</span>
                              <button onClick={() => setZoomScale(Math.min(2.5, zoomScale + 0.25))} className="hover:text-primary transition-colors w-5 text-center">+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Mobile page strip ── */}
                  <div className="sm:hidden shrink-0 border-t border-border/40 bg-card/80">
                    {/* Strip header */}
                    <div className="flex items-center justify-between px-3 pt-2 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pages · {currentDocument.pages.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => addPageInputRef.current?.click()}
                          className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2 py-1 text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Horizontal scrollable thumbnails */}
                    <div
                      ref={stripRef}
                      className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {currentDocument.pages.map((p, idx) => {
                        const selected = selectedPageIndex === idx;
                        return (
                          <button
                            key={p.id}
                            data-selected={selected}
                            onClick={() => setSelectedPageIndex(idx)}
                            className={`relative shrink-0 w-14 rounded-lg border overflow-hidden transition-all ${
                              selected
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-border/40'
                            }`}
                            style={{ aspectRatio: '3/4' }}
                          >
                            {previewUrls[p.id] ? (
                              <img src={previewUrls[p.id]} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded bg-black/60 text-[8px] font-bold text-white">
                              {idx + 1}
                            </span>
                            {/* Delete on selected */}
                            {selected && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
                                className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center"
                              >
                                <X className="h-2.5 w-2.5 text-white" />
                              </button>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT Panel — filters */}
                <div className="w-full lg:w-80 shrink-0 bg-card border-t lg:border-t-0 border-border/40 overflow-y-auto max-h-64 lg:max-h-none">
                  {activePage && (
                    <ImageEnhancer
                      filters={activePage.filters}
                      onFilterChange={handleFilterUpdate}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}