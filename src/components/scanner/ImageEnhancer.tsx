'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type EnhancementFilters } from '@/utils/imageProcessor';
import { Sun, Contrast, Check, Sparkles, FileText, Image as ImageIcon, Eye } from 'lucide-react';

interface ImageEnhancerProps {
  filters: EnhancementFilters;
  onFilterChange: (update: Partial<EnhancementFilters>) => void;
}

interface FilterPreset {
  id: EnhancementFilters['type'];
  name: string;
  desc: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function ImageEnhancer({ filters, onFilterChange }: ImageEnhancerProps) {
  const presets: FilterPreset[] = [
    { 
      id: 'original', 
      name: 'Original', 
      desc: 'Raw unmodified scan', 
      icon: ImageIcon,
      color: 'bg-neutral-500/10 text-neutral-500'
    },
    { 
      id: 'magic', 
      name: 'Magic Color', 
      desc: 'Brightens and saturates', 
      icon: Sparkles,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    { 
      id: 'bw', 
      name: 'Black & White', 
      desc: 'High text separation', 
      icon: FileText,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    },
    { 
      id: 'grayscale', 
      name: 'Grayscale', 
      desc: 'Standard monochrome', 
      icon: Eye,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    },
    { 
      id: 'sharpen', 
      name: 'Sharpen Text', 
      desc: 'Edges high-pass filter', 
      icon: Contrast,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    },
  ];

  return (
    <div className="flex flex-col h-full bg-card select-none">
      <div className="p-6 space-y-6">
        {/* Preset filter grid selector */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Enhancement Presets
          </h4>
          <div className="space-y-2">
            {presets.map((p) => {
              const active = filters.type === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onFilterChange({ type: p.id })}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/40 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${p.color}`}>
                      <p.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.desc}</p>
                    </div>
                  </div>

                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic adjustments (Brightness & Contrast Sliders) */}
        <div className="space-y-5 border-t border-border/20 pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Manual Tuning
          </h4>

          {/* Brightness Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Sun className="h-4 w-4" /> Brightness
              </span>
              <span className={filters.brightness > 0 ? 'text-primary' : filters.brightness < 0 ? 'text-rose-500' : ''}>
                {filters.brightness > 0 ? `+${filters.brightness}` : filters.brightness}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={filters.brightness}
              onChange={(e) => onFilterChange({ brightness: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 accent-primary cursor-pointer outline-none"
            />
          </div>

          {/* Contrast Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Contrast className="h-4 w-4" /> Contrast
              </span>
              <span className={filters.contrast > 0 ? 'text-primary' : filters.contrast < 0 ? 'text-rose-500' : ''}>
                {filters.contrast > 0 ? `+${filters.contrast}` : filters.contrast}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={filters.contrast}
              onChange={(e) => onFilterChange({ contrast: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 accent-primary cursor-pointer outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preset clear actions footer */}
      <div className="mt-auto border-t border-border/20 px-6 py-4 flex items-center justify-end">
        <button
          onClick={() => onFilterChange({ brightness: 0, contrast: 0, type: 'original' })}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset adjustments
        </button>
      </div>
    </div>
  );
}
