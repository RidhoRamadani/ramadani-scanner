import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScannerTheme = 'light' | 'dark' | 'system';
export type PdfPageSize = 'A4' | 'LETTER' | 'LEGAL';
export type OcrLanguage = 'eng' | 'ind';
export type LibraryViewMode = 'grid' | 'list';

interface UserPreferences {
  theme: ScannerTheme;
  defaultPdfSize: PdfPageSize;
  defaultOcrLang: OcrLanguage;
  libraryViewMode: LibraryViewMode;
  autoEdgeDetect: boolean;
  username: string;
  avatarSeed: string;
  
  // Actions
  setTheme: (theme: ScannerTheme) => void;
  setDefaultPdfSize: (size: PdfPageSize) => void;
  setDefaultOcrLang: (lang: OcrLanguage) => void;
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  setAutoEdgeDetect: (enabled: boolean) => void;
  updateProfile: (username: string, avatarSeed: string) => void;
}

export const usePreferencesStore = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: 'dark', // Modern and high-end default
      defaultPdfSize: 'A4',
      defaultOcrLang: 'eng',
      libraryViewMode: 'grid',
      autoEdgeDetect: true,
      username: 'Scanner Pro',
      avatarSeed: 'doc_user',

      setTheme: (theme) => set({ theme }),
      setDefaultPdfSize: (defaultPdfSize) => set({ defaultPdfSize }),
      setDefaultOcrLang: (defaultOcrLang) => set({ defaultOcrLang }),
      setLibraryViewMode: (libraryViewMode) => set({ libraryViewMode }),
      setAutoEdgeDetect: (autoEdgeDetect) => set({ autoEdgeDetect }),
      updateProfile: (username, avatarSeed) => set({ username, avatarSeed }),
    }),
    {
      name: 'scanner-preferences', // localStorage key
    }
  )
);
