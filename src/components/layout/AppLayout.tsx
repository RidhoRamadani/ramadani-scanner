'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar for Desktop */}
      <Sidebar />
      
      {/* Primary Workspace Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar for Mobile */}
        <Navbar />
        
        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-neutral-100/35 dark:bg-neutral-900/20 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
