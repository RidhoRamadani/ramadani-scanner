'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UploadAreaProps {
  onImageSelected: (blob: Blob) => void;
}

export default function UploadArea({ onImageSelected }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file format. Please upload an image file (PNG, JPG, HEIC).');
      return;
    }
    setErrorMsg('');
    onImageSelected(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={false}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment" // System camera on mobile
        multiple={false}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Drag-Drop Area */}
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerUpload}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 outline-none ${
          isDragActive
            ? 'border-primary bg-primary/5 shadow-inner'
            : 'border-border/60 bg-card hover:bg-neutral-200/10 hover:border-border'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
          <Upload className="h-6 w-6" />
        </div>

        <h3 className="text-base font-semibold tracking-tight mb-1">
          Upload document image
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-6">
          Drag & drop your files here or click to browse. Supports PDF snapshots, JPG, PNG, and JPEG.
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerCamera();
            }}
            className="flex items-center gap-2 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700/80 transition-colors shadow-sm"
          >
            <Camera className="h-4 w-4 text-primary animate-pulse" />
            Capture Camera
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerUpload();
            }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow-md shadow-primary/15"
          >
            <ImageIcon className="h-4 w-4" />
            Browse Files
          </button>
        </div>
      </motion.div>

      {/* Error reporting alert */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload failed</p>
            <p className="mt-0.5 opacity-90">{errorMsg}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
