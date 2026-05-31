'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import UploadArea from '@/components/scanner/UploadArea';
import CropViewer from '@/components/scanner/CropViewer';
import ImageEnhancer from '@/components/scanner/ImageEnhancer';
import { useScannerStore } from '@/store/scannerStore';
import { warpPerspective, applyImageEnhancements, loadImageElement } from '@/utils/imageProcessor';
import { 
  FileText, 
  Plus, 
  Trash2, 
  RotateCw, 
  RotateCcw, 
  Save, 
  ChevronUp, 
  ChevronDown, 
  ArrowLeft,
  Sparkles,
  Crop,
  Layers,
  Search,
  CheckCircle,
  Clock
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
    resetScanner
  } = useScannerStore();

  const [activeTab, setActiveTab] = useState<'crop' | 'filters'>('crop');
  const [docName, setDocName] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoomScale, setZoomScale] = useState(1);

  // Initialize a new document if none is open
  useEffect(() => {
    if (!currentDocument) {
      startNewDocument('');
    }
  }, [currentDocument]);

  // Clean up object URLs for thumbnails to prevent memory leaks
  useEffect(() => {
    if (!currentDocument) return;

    const urls: Record<string, string> = {};
    currentDocument.pages.forEach(p => {
      // Use enhanced image for thumbnail previews if available
      urls[p.id] = URL.createObjectURL(p.enhancedImage);
    });

    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [currentDocument?.pages]);

  const activePage = currentDocument?.pages[selectedPageIndex];

  // Triggers canvas-based perspective warping in the background
  const runPerspectiveWarp = async (cornersList = activePage?.corners) => {
    if (!currentDocument || !activePage || !cornersList) return;
    
    setProcessing(true);
    try {
      // 1. Warp perspective
      const warpedBlob = await warpPerspective(activePage.originalImage, cornersList);
      
      // 2. Immediate filter application
      const enhancedBlob = await applyImageEnhancements(warpedBlob, activePage.filters);
      
      updatePageProcessedImages(activePage.id, warpedBlob, enhancedBlob);
    } catch (e) {
      console.error('Warp perspective failed', e);
    } finally {
      setProcessing(false);
    }
  };

  // Re-run enhancements whenever brightness/contrast/filter options are tweaked
  const handleFilterUpdate = async (filterChange: any) => {
    if (!currentDocument || !activePage) return;
    
    // Optimistic state update
    updatePageFilters(activePage.id, filterChange);
    
    // Run enhance execution in background
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

  // Handle corners adjustment from interactive crop canvas
  const handleCropSave = (newCorners: any) => {
    if (!activePage) return;
    updatePageCorners(activePage.id, newCorners);
    runPerspectiveWarp(newCorners);
  };

  // Rotates original image itself by 90 degrees
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
        
        // Reset corners to standard template relative to rotated dimensions
        const defaultCorners = [
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 }
        ];

        // 1. Warp perspective on rotated image
        const warpedBlob = await warpPerspective(rotatedBlob, defaultCorners);
        
        // 2. Re-apply existing filters
        const enhancedBlob = await applyImageEnhancements(warpedBlob, activePage.filters);
        
        // Update states
        updatePageCorners(activePage.id, defaultCorners);
        
        // Save images (utilizes custom helper to rewrite originalImage alongside warped layers)
        const store = useScannerStore.getState();
        if (store.currentDocument) {
          const updatedPages = store.currentDocument.pages.map(page => 
            page.id === activePage.id 
              ? { ...page, originalImage: rotatedBlob, croppedImage: warpedBlob, enhancedImage: enhancedBlob } 
              : page
          );
          useScannerStore.setState({
            currentDocument: {
              ...store.currentDocument,
              pages: updatedPages,
              updatedAt: new Date()
            }
          });
        }
        
        setProcessing(false);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error('Rotation failed', e);
      setProcessing(false);
    }
  };

  const handleImageUploaded = async (blob: Blob) => {
    setProcessing(true);
    try {
      const pageId = await addPage(blob);
      // Run perspective warp with default corners immediately
      const defaultCorners = [
        { x: 0.05, y: 0.05 },
        { x: 0.95, y: 0.05 },
        { x: 0.95, y: 0.95 },
        { x: 0.05, y: 0.95 }
      ];
      
      const warpedBlob = await warpPerspective(blob, defaultCorners);
      const enhancedBlob = await applyImageEnhancements(warpedBlob, {
        type: 'original',
        brightness: 0,
        contrast: 0
      });
      
      updatePageProcessedImages(pageId, warpedBlob, enhancedBlob);
    } catch (e) {
      console.error('Upload handling failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!currentDocument || currentDocument.pages.length === 0) return;
    
    setProcessing(true);
    try {
      // Update document name if changed
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

  // Button pagination reordering triggers
  const movePage = (index: number, direction: 'up' | 'down') => {
    if (!currentDocument) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentDocument.pages.length) return;

    const pagesCopy = [...currentDocument.pages];
    const [moved] = pagesCopy.splice(index, 1);
    pagesCopy.splice(targetIdx, 0, moved);

    useScannerStore.setState({
      currentDocument: {
        ...currentDocument,
        pages: pagesCopy,
        updatedAt: new Date()
      },
      selectedPageIndex: targetIdx
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Workspace Sub Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetScanner();
                router.push('/dashboard');
              }}
              className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={currentDocument?.name || 'Untitled Scan'}
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="bg-transparent border-b border-transparent hover:border-border focus:border-primary text-sm font-semibold py-0.5 px-1 outline-none transition-colors max-w-[200px] sm:max-w-xs truncate"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentDocument && currentDocument.pages.length > 0 && (
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-all shadow-md shadow-primary/10"
              >
                <Save className="h-3.5 w-3.5" />
                Save Document ({currentDocument.pages.length} Pages)
              </button>
            )}
          </div>
        </div>

        {/* Dynamic page splitter */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT Sidebar - Multi-page navigation & Add button */}
          {currentDocument && currentDocument.pages.length > 0 && (
            <div className="w-56 shrink-0 border-r border-border/40 bg-card/40 flex flex-col overflow-y-auto p-4 space-y-4 hidden sm:flex select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Document Pages
                </span>
                <span className="text-xs font-semibold text-primary">
                  {selectedPageIndex + 1} / {currentDocument.pages.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 pr-1 overflow-y-auto">
                {currentDocument.pages.map((p, idx) => {
                  const selected = selectedPageIndex === idx;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPageIndex(idx)}
                      className={`group relative rounded-xl border p-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                      }`}
                    >
                      {/* Thumbnail wrapper */}
                      <div className="aspect-[3/4] w-full rounded-lg bg-neutral-200/10 dark:bg-neutral-800/10 overflow-hidden relative flex items-center justify-center">
                        {previewUrls[p.id] ? (
                          <img
                            src={previewUrls[p.id]}
                            alt={`Page ${idx + 1}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        )}
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md bg-neutral-900/65 text-[10px] font-bold text-white backdrop-blur-[2px]">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Control arrows & deletion overlay visible on hover */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-950/80 p-1 rounded-lg backdrop-blur-[2px] z-10">
                        {idx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(idx, 'up');
                            }}
                            className="p-0.5 hover:bg-white/10 rounded text-white"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                        )}
                        {idx < currentDocument.pages.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(idx, 'down');
                            }}
                            className="p-0.5 hover:bg-white/10 rounded text-white"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePage(p.id);
                          }}
                          className="p-0.5 hover:bg-rose-500/80 rounded text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Page Button */}
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUploaded(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 py-3.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-all active:scale-95 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Page
              </button>
            </div>
          )}

          {/* MAIN Workbench */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* If no page is present yet */}
            {(!currentDocument || currentDocument.pages.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-neutral-100/35 dark:bg-neutral-900/10">
                <UploadArea onImageSelected={handleImageUploaded} />
              </div>
            ) : (
              <>
                {/* Center Workspace (Interactive SVG Editor or filter previews) */}
                <div className="flex-1 flex flex-col overflow-hidden relative border-r border-border/40">
                  {/* Action Toolbar above page */}
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-6 bg-card/60 select-none">
                    {/* Workspace tabs */}
                    <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-neutral-200/30 dark:bg-neutral-800/40 text-xs">
                      <button
                        onClick={() => setActiveTab('crop')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                          activeTab === 'crop'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Crop className="h-3.5 w-3.5" />
                        Crop & Perspective
                      </button>
                      <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                          activeTab === 'filters'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Filters
                      </button>
                    </div>

                    {/* Quick manipulations */}
                    <div className="flex items-center gap-2">
                      {isProcessing && (
                        <span className="text-[10px] font-semibold text-primary animate-pulse flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                          Processing...
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleRotate('left')}
                        disabled={isProcessing}
                        className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Rotate Counter-Clockwise"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRotate('right')}
                        disabled={isProcessing}
                        className="rounded-lg p-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Rotate Clockwise"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Canvas Viewport */}
                  <div className="flex-1 relative overflow-hidden bg-neutral-900/5 dark:bg-neutral-950/20">
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
                          // Render full page enhanced result
                          <div className="h-full w-full flex flex-col items-center justify-center p-6 select-none relative">
                            {/* Scanning laser visualizer if processing */}
                            {isProcessing && (
                              <div className="absolute left-[15%] right-[15%] top-6 bottom-6 z-20 pointer-events-none rounded-lg overflow-hidden border border-primary/20">
                                <div className="laser-line" />
                              </div>
                            )}

                            <div className="max-h-[60vh] max-w-full relative flex items-center justify-center">
                              {previewUrls[activePage.id] ? (
                                <img
                                  style={{ transform: `scale(${zoomScale})` }}
                                  src={previewUrls[activePage.id]}
                                  alt="Warped enhance output"
                                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                              )}
                            </div>

                            {/* Zoom sliders */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-full bg-card/85 border border-border/20 backdrop-blur-md shadow-sm text-xs font-semibold">
                              <button 
                                onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))}
                                className="hover:text-primary transition-colors px-1"
                              >
                                -
                              </button>
                              <span>{Math.round(zoomScale * 100)}%</span>
                              <button 
                                onClick={() => setZoomScale(Math.min(2.5, zoomScale + 0.25))}
                                className="hover:text-primary transition-colors px-1"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT Sidebar Panel - Interactive slider tuning (Tabs alternate filters) */}
                <div className="w-full lg:w-80 shrink-0 bg-card border-t lg:border-t-0 border-border/40 overflow-y-auto">
                  {activePage && (
                    <ImageEnhancer
                      filters={activePage.filters}
                      onFilterChange={handleFilterUpdate}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
