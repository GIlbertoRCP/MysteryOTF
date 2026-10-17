import React from 'react';
import { Command } from 'lucide-react';

export const HotkeyGuide: React.FC = () => {
  return (
    <div className="fixed bottom-3 left-4 z-30 pointer-events-none hidden md:flex items-center gap-2 bg-black/80 border border-amber-900/40 px-3 py-1.5 rounded-full text-[10px] font-mono text-amber-300/80 shadow-xl backdrop-blur-sm">
      <Command size={12} className="text-amber-400" />
      <span>HOTKEYS:</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[C] Case File</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[I] Interrogate</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[W] Radio</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[R] Rain</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[T] Tidy</span>
      <span className="bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-amber-200">[ESC] Cancel</span>
    </div>
  );
};
