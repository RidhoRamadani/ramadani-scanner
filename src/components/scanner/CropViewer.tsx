'use client';

import React, { useRef, useState, useEffect } from 'react';
import { type CropPoint } from '@/db/database';
import { useScannerStore } from '@/store/scannerStore';
import { RefreshCw, Check, Maximize } from 'lucide-react';
import { detectDocumentEdges } from '@/utils/imageProcessor';

interface CropViewerProps {
  pageId: string;
  originalImage: Blob;
  corners: CropPoint[];
  onCropSave: (corners: CropPoint[]) => void;
}

export default function CropViewer({ pageId, originalImage, corners, onCropSave }: CropViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgUrl, setImgUrl] = useState<string>('');
  
  // Render coordinates for vertices (absolute pixels on the current layout dimensions)
  const [renderedCorners, setRenderedCorners] = useState<{ x: number; y: number }[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  
  // Magnifier Loupe states
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [loupeBgPos, setLoupeBgPos] = useState('');

  // Set up the blob image URL
  useEffect(() => {
    const url = URL.createObjectURL(originalImage);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [originalImage]);

  // Recalculate absolute pixel positions of corners when the image sizes change
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const w = imgRef.current.clientWidth;
    const h = imgRef.current.clientHeight;
    setDimensions({ width: w, height: h });
    
    // Map relative % to absolute rendered pixels
    const absPoints = corners.map(c => ({
      x: c.x * w,
      y: c.y * h
    }));
    setRenderedCorners(absPoints);
  };

  // Keep coordinates updated if page corners change externally (e.g. Reset)
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    const absPoints = corners.map(c => ({
      x: c.x * dimensions.width,
      y: c.y * dimensions.height
    }));
    setRenderedCorners(absPoints);
  }, [corners, dimensions]);

  // Resize listener to ensure handles align properly on responsive grid adjustments
  useEffect(() => {
    const handleResize = () => {
      handleImageLoad();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [corners]);

  // Start dragging a handle (works for mouse and touch)
  const handleDragStart = (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setActiveHandle(index);
    setShowLoupe(true);
    updateLoupe(index, e);
  };

  // Perform active drag adjustments
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (activeHandle === null || !imgRef.current || renderedCorners.length === 0) return;

      const rect = imgRef.current.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Constrain points inside the image bounds
      let x = clientX - rect.left;
      let y = clientY - rect.top;
      
      x = Math.max(0, Math.min(dimensions.width, x));
      y = Math.max(0, Math.min(dimensions.height, y));

      const updated = [...renderedCorners];
      updated[activeHandle] = { x, y };
      setRenderedCorners(updated);

      // Track Loupe circle
      const pageX = clientX - (containerRef.current?.getBoundingClientRect().left || 0);
      const pageY = clientY - (containerRef.current?.getBoundingClientRect().top || 0);
      setLoupePos({ x: pageX, y: pageY - 60 }); // Position magnifying loupe above the cursor

      // Set Loupe zoom mapping using high performance CSS backgrounds
      const zoom = 2.5;
      const bgX = (x / dimensions.width) * 100;
      const bgY = (y / dimensions.height) * 100;
      setLoupeBgPos(`${bgX}% ${bgY}%`);
    };

    const handleRelease = () => {
      if (activeHandle !== null && dimensions.width > 0) {
        // Save back coordinates as relative %
        const relCorners: CropPoint[] = renderedCorners.map(pt => ({
          x: pt.x / dimensions.width,
          y: pt.y / dimensions.height
        }));
        onCropSave(relCorners);
      }
      setActiveHandle(null);
      setShowLoupe(false);
    };

    if (activeHandle !== null) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleRelease);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleRelease);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleRelease);
    };
  }, [activeHandle, renderedCorners, dimensions, onCropSave]);

  const updateLoupe = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const cX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const pageX = cX - (containerRef.current?.getBoundingClientRect().left || 0);
    const pageY = cY - (containerRef.current?.getBoundingClientRect().top || 0);
    setLoupePos({ x: pageX, y: pageY - 60 });

    const x = renderedCorners[index].x;
    const y = renderedCorners[index].y;
    const bgX = (x / dimensions.width) * 100;
    const bgY = (y / dimensions.height) * 100;
    setLoupeBgPos(`${bgX}% ${bgY}%`);
  };

  const handleReset = () => {
    const defaults = [
      { x: 0.05, y: 0.05 },
      { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 },
      { x: 0.05, y: 0.95 }
    ];
    onCropSave(defaults);
  };

  const handleAutoEdge = async () => {
    const detected = await detectDocumentEdges(originalImage);
    onCropSave(detected);
  };

  // Build the polygon string path for the dark outer dimming mask
  const buildSvgPath = () => {
    if (renderedCorners.length < 4) return '';
    const outer = `M 0,0 L ${dimensions.width},0 L ${dimensions.width},${dimensions.height} L 0,${dimensions.height} Z`;
    const inner = `M ${renderedCorners[0].x},${renderedCorners[0].y} L ${renderedCorners[1].x},${renderedCorners[1].y} L ${renderedCorners[2].x},${renderedCorners[2].y} L ${renderedCorners[3].x},${renderedCorners[3].y} Z`;
    return `${outer} ${inner}`;
  };

  const pts = renderedCorners.map(pt => `${pt.x},${pt.y}`).join(' ');

  return (
    <div className="flex flex-col h-full bg-neutral-900/5 select-none relative">
      {/* Dynamic Loupe/Magnifying Bubble */}
      {showLoupe && (
        <div
          style={{
            position: 'absolute',
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            transform: 'translate(-50%, -50%)',
            backgroundImage: `url(${imgUrl})`,
            backgroundPosition: loupeBgPos,
            backgroundSize: `${dimensions.width * 2.5}px ${dimensions.height * 2.5}px`,
            backgroundRepeat: 'no-repeat',
            width: '90px',
            height: '90px',
          }}
          className="z-50 rounded-full border-2 border-white shadow-2xl pointer-events-none ring-2 ring-primary/40 bg-neutral-950"
        />
      )}

      {/* Main Image CROPPING Board */}
      <div 
        ref={containerRef} 
        className="flex-1 relative flex items-center justify-center p-6 overflow-hidden min-h-[350px]"
      >
        <div className="relative inline-block max-h-full">
          {/* Document Canvas Image */}
          <img
            ref={imgRef}
            src={imgUrl}
            onLoad={handleImageLoad}
            alt="Scanner cropping sheet"
            className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-md pointer-events-none"
          />

          {/* SVG Overlay layer */}
          {dimensions.width > 0 && renderedCorners.length === 4 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
              }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              {/* Dimmed backdrop outside crop area (using winding rule) */}
              <path
                d={buildSvgPath()}
                fill="rgba(0, 0, 0, 0.52)"
                fillRule="evenodd"
                className="transition-colors"
              />

              {/* Bounding Line Polygon */}
              <polygon
                points={pts}
                fill="rgba(16, 185, 129, 0.05)"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            </svg>
          )}

          {/* Interactive Absolute Corners Handle Elements */}
          {dimensions.width > 0 && renderedCorners.map((pt, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${pt.x}px`,
                top: `${pt.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={handleDragStart(idx)}
              onTouchStart={handleDragStart(idx)}
              className="z-20 crop-handle"
            />
          ))}
        </div>
      </div>

      {/* Crop Controls footer */}
      <div className="border-t border-border/10 bg-neutral-900/5 px-6 py-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Maximize className="h-3 w-3 text-primary" /> Drag corners to align page borders.
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-border/40 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 px-3.5 py-2 text-xs font-semibold text-foreground transition-all active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Crop
          </button>
          
          <button
            onClick={handleAutoEdge}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 px-3.5 py-2 text-xs font-semibold text-primary transition-all active:scale-95 shadow-sm"
          >
            Auto Detect
          </button>
        </div>
      </div>
    </div>
  );
}
