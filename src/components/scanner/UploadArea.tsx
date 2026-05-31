'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, FolderOpen, AlertCircle, X, Trash2 } from 'lucide-react';

interface UploadAreaProps {
  onImagesSelected: (files: File[]) => void;
  maxFiles?: number;
}

interface PreviewFile {
  file: File;
  previewUrl: string;
  id: string;
}

export default function UploadArea({ onImagesSelected, maxFiles = 20 }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  const processFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    let rejected = 0;

    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        rejected++;
        return;
      }
      const isDuplicate = previews.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      );
      if (!isDuplicate) validFiles.push(file);
    });

    if (rejected > 0) {
      setErrorMsg(`${rejected} file ditolak — hanya gambar yang didukung (JPG, PNG, HEIC).`);
    } else {
      setErrorMsg('');
    }

    if (validFiles.length === 0) return;

    const newPreviews: PreviewFile[] = [];
    for (const file of validFiles) {
      if (previews.length + newPreviews.length >= maxFiles) break;
      newPreviews.push({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      });
    }

    const combined = [...previews, ...newPreviews];
    setPreviews(combined);
    onImagesSelected(combined.map((p) => p.file));
  }, [previews, maxFiles, onImagesSelected]);

  const removeFile = (id: string) => {
    const updated = previews.filter((p) => {
      if (p.id === id) {
        URL.revokeObjectURL(p.previewUrl);
        return false;
      }
      return true;
    });
    setPreviews(updated);
    onImagesSelected(updated.map((p) => p.file));
  };

  const clearAll = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPreviews([]);
    onImagesSelected([]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset so same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop Zone */}
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        whileTap={{ scale: 0.99 }}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border/60 bg-card hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 hover:border-border'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Upload beberapa gambar</h3>
        <p className="text-xs text-muted-foreground max-w-xs mb-5">
          Drag & drop file di sini atau tekan tombol di bawah. Mendukung JPG, PNG, HEIC.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="flex items-center gap-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Camera className="h-4 w-4 text-primary" />
            Kamera
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/15"
          >
            <FolderOpen className="h-4 w-4" />
            Pilih File
          </button>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal upload</p>
              <p className="mt-0.5 opacity-90">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Grid */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {previews.length} gambar dipilih
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Hapus semua
              </button>
            </div>

            {/* Thumbnail grid — 3 cols on mobile, 4 on sm+ */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <AnimatePresence>
                {previews.map((preview) => (
                  <motion.div
                    key={preview.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-border/40 bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.previewUrl}
                      alt={preview.file.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150" />
                    {/* Filename label */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1">
                      <p className="text-[10px] text-white truncate leading-tight">
                        {preview.file.name}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeFile(preview.id)}
                      aria-label={`Hapus ${preview.file.name}`}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Submit button */}
            <button
              type="button"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/15 active:scale-[0.98]"
            >
              Kirim {previews.length} gambar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}