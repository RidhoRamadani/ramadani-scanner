import Dexie, { type Table } from 'dexie';

export interface CropPoint {
  x: number; // 0 to 1 representing relative width
  y: number; // 0 to 1 representing relative height
}

export interface DocumentPage {
  id: string;
  originalImage: Blob;     // Raw uploaded image
  croppedImage: Blob;      // Warped image after perspective correction
  enhancedImage: Blob;     // Final image after filters/brightness/contrast
  corners: CropPoint[];    // TL, TR, BR, BL relative coordinates
  filters: {
    type: 'original' | 'bw' | 'grayscale' | 'magic' | 'sharpen';
    brightness: number;    // -100 to 100
    contrast: number;      // -100 to 100
  };
  ocrText?: string;
  ocrConfidence?: number;
  ocrLanguage?: string;
}

export interface ScanDocument {
  id: string;
  name: string;
  pages: DocumentPage[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  sizeBytes: number;
}

class DocumentScannerDB extends Dexie {
  documents!: Table<ScanDocument, string>;

  constructor() {
    super('DocumentScannerDB');
    this.version(1).stores({
      documents: 'id, name, createdAt, updatedAt, isFavorite, sizeBytes'
    });
  }
}

export const db = new DocumentScannerDB();

// Helper to format file size
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Calculate sizes of all blobs inside a document
export async function calculateDocSize(pages: DocumentPage[]): Promise<number> {
  let size = 0;
  for (const page of pages) {
    size += page.originalImage.size;
    size += page.croppedImage.size;
    size += page.enhancedImage.size;
  }
  return size;
}
