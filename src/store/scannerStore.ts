import { create } from 'zustand';
import { db, type ScanDocument, type DocumentPage, type CropPoint, calculateDocSize } from '@/db/database';

interface ScannerState {
  currentDocument: ScanDocument | null;
  selectedPageIndex: number;
  isProcessing: boolean;
  
  // Actions
  startNewDocument: (name: string) => void;
  loadDocumentForEditing: (doc: ScanDocument) => void;
  addPage: (originalImage: Blob) => Promise<string>;
  updatePageCorners: (pageId: string, corners: CropPoint[]) => void;
  updatePageFilters: (
    pageId: string, 
    filterUpdate: Partial<DocumentPage['filters']>
  ) => void;
  updatePageProcessedImages: (
    pageId: string, 
    croppedImage: Blob, 
    enhancedImage: Blob
  ) => void;
  updatePageOcr: (
    pageId: string, 
    text: string, 
    confidence: number, 
    language: string
  ) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (activeId: string, overId: string) => void;
  setSelectedPageIndex: (index: number) => void;
  setProcessing: (isProcessing: boolean) => void;
  saveDocument: () => Promise<ScanDocument>;
  resetScanner: () => void;
}

// Generates a random standard ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Standard default corners (slightly inset from edge)
export const DEFAULT_CORNERS: CropPoint[] = [
  { x: 0.05, y: 0.05 }, // Top Left
  { x: 0.95, y: 0.05 }, // Top Right
  { x: 0.95, y: 0.95 }, // Bottom Right
  { x: 0.05, y: 0.95 }  // Bottom Left
];

export const useScannerStore = create<ScannerState>((set, get) => ({
  currentDocument: null,
  selectedPageIndex: 0,
  isProcessing: false,

  startNewDocument: (name: string) => {
    const newDoc: ScanDocument = {
      id: generateId(),
      name: name || `Scan_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
      pages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
      sizeBytes: 0
    };
    set({ currentDocument: newDoc, selectedPageIndex: 0, isProcessing: false });
  },

  loadDocumentForEditing: (doc: ScanDocument) => {
    set({ currentDocument: JSON.parse(JSON.stringify(doc)), selectedPageIndex: 0, isProcessing: false });
  },

  addPage: async (originalImage: Blob) => {
    const { currentDocument } = get();
    if (!currentDocument) {
      throw new Error('No active document. Call startNewDocument first.');
    }

    const pageId = generateId();
    
    // Default: cropped and enhanced images are initially copies of the original
    const newPage: DocumentPage = {
      id: pageId,
      originalImage,
      croppedImage: originalImage,
      enhancedImage: originalImage,
      corners: [...DEFAULT_CORNERS],
      filters: {
        type: 'original',
        brightness: 0,
        contrast: 0
      }
    };

    const updatedPages = [...currentDocument.pages, newPage];
    const docSize = await calculateDocSize(updatedPages);

    set({
      currentDocument: {
        ...currentDocument,
        pages: updatedPages,
        sizeBytes: docSize,
        updatedAt: new Date()
      },
      selectedPageIndex: updatedPages.length - 1
    });

    return pageId;
  },

  updatePageCorners: (pageId: string, corners: CropPoint[]) => {
    const { currentDocument } = get();
    if (!currentDocument) return;

    const updatedPages = currentDocument.pages.map(page => 
      page.id === pageId ? { ...page, corners } : page
    );

    set({
      currentDocument: {
        ...currentDocument,
        pages: updatedPages,
        updatedAt: new Date()
      }
    });
  },

  updatePageFilters: (pageId: string, filterUpdate: Partial<DocumentPage['filters']>) => {
    const { currentDocument } = get();
    if (!currentDocument) return;

    const updatedPages = currentDocument.pages.map(page => 
      page.id === pageId 
        ? { ...page, filters: { ...page.filters, ...filterUpdate } } 
        : page
    );

    set({
      currentDocument: {
        ...currentDocument,
        pages: updatedPages,
        updatedAt: new Date()
      }
    });
  },

  updatePageProcessedImages: (pageId: string, croppedImage: Blob, enhancedImage: Blob) => {
    const { currentDocument } = get();
    if (!currentDocument) return;

    const updatedPages = currentDocument.pages.map(page => 
      page.id === pageId 
        ? { ...page, croppedImage, enhancedImage } 
        : page
    );

    calculateDocSize(updatedPages).then(docSize => {
      set({
        currentDocument: {
          ...currentDocument,
          pages: updatedPages,
          sizeBytes: docSize,
          updatedAt: new Date()
        }
      });
    });
  },

  updatePageOcr: (pageId: string, text: string, confidence: number, language: string) => {
    const { currentDocument } = get();
    if (!currentDocument) return;

    const updatedPages = currentDocument.pages.map(page => 
      page.id === pageId 
        ? { ...page, ocrText: text, ocrConfidence: confidence, ocrLanguage: language } 
        : page
    );

    set({
      currentDocument: {
        ...currentDocument,
        pages: updatedPages,
        updatedAt: new Date()
      }
    });
  },

  deletePage: (pageId: string) => {
    const { currentDocument, selectedPageIndex } = get();
    if (!currentDocument) return;

    const pageIndex = currentDocument.pages.findIndex(p => p.id === pageId);
    const updatedPages = currentDocument.pages.filter(p => p.id !== pageId);

    let newSelectedIndex = selectedPageIndex;
    if (selectedPageIndex >= updatedPages.length && updatedPages.length > 0) {
      newSelectedIndex = updatedPages.length - 1;
    }

    calculateDocSize(updatedPages).then(docSize => {
      set({
        currentDocument: {
          ...currentDocument,
          pages: updatedPages,
          sizeBytes: docSize,
          updatedAt: new Date()
        },
        selectedPageIndex: newSelectedIndex
      });
    });
  },

  reorderPages: (activeId: string, overId: string) => {
    const { currentDocument } = get();
    if (!currentDocument) return;

    const oldIndex = currentDocument.pages.findIndex(p => p.id === activeId);
    const newIndex = currentDocument.pages.findIndex(p => p.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const updatedPages = [...currentDocument.pages];
    const [movedPage] = updatedPages.splice(oldIndex, 1);
    updatedPages.splice(newIndex, 0, movedPage);

    set({
      currentDocument: {
        ...currentDocument,
        pages: updatedPages,
        updatedAt: new Date()
      },
      selectedPageIndex: newIndex
    });
  },

  setSelectedPageIndex: (index: number) => {
    const { currentDocument } = get();
    if (!currentDocument) return;
    if (index >= 0 && index < currentDocument.pages.length) {
      set({ selectedPageIndex: index });
    }
  },

  setProcessing: (isProcessing: boolean) => set({ isProcessing }),

  saveDocument: async () => {
    const { currentDocument } = get();
    if (!currentDocument || currentDocument.pages.length === 0) {
      throw new Error('Nothing to save. Ensure pages are scanned.');
    }

    currentDocument.updatedAt = new Date();
    await db.documents.put(currentDocument);
    return currentDocument;
  },

  resetScanner: () => set({ currentDocument: null, selectedPageIndex: 0, isProcessing: false })
}));
