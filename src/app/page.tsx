'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Scan, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  FileText, 
  FileSpreadsheet, 
  Lock,
  Heart
} from 'lucide-react';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 20 }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-[#09090b] via-[#0d0d11] to-[#09090b] text-zinc-50 overflow-hidden font-sans select-none">
      
      {/* Visual Scanning Grid backdrop */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Decorative emerald laser glow ball */}
      <div className="absolute top-[-10%] left-[30%] right-[30%] h-[350px] w-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none z-0 glow-primary" />

      {/* NAVBAR */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 bg-neutral-950/20 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-md shadow-primary/20">
            <Scan className="h-5 w-5 text-white animate-pulse" />
          </div>
          <span className="font-semibold text-base tracking-tight">
            SmansaScan<span className="text-primary font-bold">Pro</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4.5 py-2.5 text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
          >
            Enter App Dashboard
            <ArrowRight className="h-4 w-4 text-primary" />
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Tagline Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/25 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-xs glow-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            100% Serverless & Client-Side Sandbox
          </motion.div>

          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-transparent"
          >
            Professional Paper Scanner <br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Fully Local on your Browser
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p 
            variants={itemVariants}
            className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            No servers, no databases, and no leaking files. Scan high-quality papers, align perspective edges, run OCR text extractions, and compile PDFs fully offline using browser IndexedDB storage.
          </motion.p>

          {/* Call-to-actions */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              href="/scanner"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/95 text-neutral-950 font-bold px-8 py-3.5 text-sm tracking-wide transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Scan className="h-4.5 w-4.5 text-neutral-900" />
              Launch Scan Studio
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold px-8 py-3.5 text-sm tracking-wide transition-all active:scale-95"
            >
              Explore Local Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* CORE ENGINES SHOWCASE - 3 CARDS */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 select-none">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 text-center mb-8">
          Powered by Client-Side Web Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Perspective Warp Math',
              desc: 'Calculates the inverse homography using Gaussian elimination to crop and flatten sheet layers with smooth bilinear pixel interpolation.',
              icon: Cpu,
              accent: 'text-primary bg-primary/10 border-primary/20'
            },
            {
              title: 'Tesseract.js OCR Engine',
              desc: 'Local WASM OCR engine that parses characters, detects text paragraphs, and generates confidence reports for English and Indonesian languages.',
              icon: FileText,
              accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
            },
            {
              title: 'PDF-Lib Layout Compiler',
              desc: 'Assembles, compresses, and compiles embedded image arrays into standard PDF documents supporting A4, Letter, and Legal paper dimensions.',
              icon: FileSpreadsheet,
              accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="bg-[#111115]/50 rounded-2xl border border-white/5 hover:border-white/10 p-6 space-y-4 hover:shadow-2xl hover:shadow-black transition-all duration-200"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${item.accent}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRIVACY PILLAR SHOWCASE */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 select-none">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0c1512] to-[#09090b] p-8 md:p-10 space-y-6 flex flex-col md:flex-row gap-8 items-center glow-primary">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-primary">
              <Lock className="h-3.5 w-3.5" /> Privacy First Sandbox
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">
              Your sensitive papers never leave your device.
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Standard scanner utilities upload your files, bills, IDs, or receipts into database servers. CamScan Pro operates entirely client-side: all perspective warping calculations, image filtering, OCR text extractions, and PDF compilations are done in-memory on your own browser, saving documents safely inside local IndexedDB storage.
            </p>
          </div>
          <div className="h-28 w-28 shrink-0 flex items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-xl shadow-primary/5 glow-primary animate-pulse">
            <ShieldCheck className="h-14 w-14" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500 font-semibold select-none mt-auto">
        <div className="flex items-center gap-2">
          <span>© 2026 SmansaScan Pro. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-1">
          Made with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse mx-0.5" /> using Next.js 16 & Dexie
        </div>
      </footer>
    </div>
  );
}
