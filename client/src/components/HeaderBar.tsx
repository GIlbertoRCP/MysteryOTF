import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ShieldAlert, FileText, LayoutGrid, Timer, MessageSquare, Palette, Settings, Camera, Shield } from 'lucide-react';
import { RoomState, Role } from '../types';

interface HeaderBarProps {
  roomState: RoomState;
  myRole: Role;
  myName: string;
  canvasTheme: 'corkboard' | 'blackboard' | 'blueprint' | 'mindplace';
  onSelectTheme: (theme: 'corkboard' | 'blackboard' | 'blueprint' | 'mindplace') => void;
  onOpenAccusation: () => void;
  onOpenSynopsis: () => void;
  onOpenInterrogation: () => void;
  onAutoTidyBoard: () => void;
  onExportBoardImage?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  roomState,
  myRole,
  myName,
  canvasTheme,
  onSelectTheme,
  onOpenAccusation,
  onOpenSynopsis,
  onOpenInterrogation,
  onAutoTidyBoard,
  onExportBoardImage
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 w-full bg-[#160b06] border-b-2 border-[#3d2113] px-6 flex items-center justify-between text-amber-100 z-40 relative shadow-2xl flex-nowrap shrink-0">
      
      {/* LEFT ZONE: Stamped Brass Room Code Plaque & Case Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="brass-plaque">
          <Shield size={13} className="text-amber-900" />
          <span className="text-[11px] font-mono">INVESTIGATION NO.</span>
          <strong className="text-black font-black text-sm tracking-wider">{roomState.roomCode}</strong>
          <button
            onClick={handleCopyCode}
            className="hover:text-amber-900 transition-colors inline-flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded text-[9px] border border-black/30 cursor-pointer ml-1"
            title="Copy Room Code"
          >
            {copied ? <Check size={9} className="text-green-900" /> : <Copy size={9} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>

        <span className="font-typewriter text-xs text-amber-200/80 truncate max-w-[220px] hidden md:inline">
          {roomState.mystery.title}
        </span>
      </div>

      {/* CENTER ZONE: Manila Folder Navigation Tabs */}
      <div className="flex items-center gap-2 pt-2 shrink-0">
        <button
          onClick={() => {}}
          className="manila-tab active"
        >
          CASE BOARD
        </button>

        <button
          onClick={onOpenInterrogation}
          className="manila-tab opacity-80 hover:opacity-100"
        >
          <MessageSquare size={13} /> PROFILING
        </button>

        <button
          onClick={onOpenSynopsis}
          className="manila-tab opacity-80 hover:opacity-100"
        >
          <FileText size={13} /> THE DOSSIER
        </button>
      </div>

      {/* RIGHT ZONE: Timer, Options & Crimson Rubber Stamp */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Countdown Clock */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-amber-900/40 px-3 py-1.5 rounded font-mono text-xs text-red-300">
          <Timer size={14} className="animate-pulse text-red-400" />
          <span className="font-bold tracking-wider">{formatTime(timeLeft)}</span>
        </div>

        {/* Options Popover Menu */}
        <div className="relative" ref={optionsRef}>
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 p-2 rounded text-amber-300 transition flex items-center gap-1 text-xs font-mono cursor-pointer"
            title="Board Options"
          >
            <Settings size={16} />
          </button>

          {isOptionsOpen && (
            <div className="absolute right-0 top-10 w-64 bg-black/95 border border-amber-800/60 rounded-xl p-3 shadow-2xl backdrop-blur-md z-50 text-xs font-mono space-y-3">
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider border-b border-amber-900/40 pb-1 flex items-center justify-between">
                <span>MIND PLACE OPTIONS</span>
                <button onClick={() => setIsOptionsOpen(false)} className="text-amber-400 cursor-pointer">✕</button>
              </div>

              <div>
                <label className="block text-[10px] text-amber-400 mb-1 flex items-center gap-1">
                  <Palette size={12} /> BOARD STYLE:
                </label>
                <select
                  value={canvasTheme}
                  onChange={(e: any) => onSelectTheme(e.target.value)}
                  className="w-full bg-black/80 border border-amber-800 rounded px-2 py-1 text-amber-100 text-xs focus:outline-none"
                >
                  <option value="mindplace">Alan Wake Mind Place</option>
                  <option value="corkboard">Classic Corkboard</option>
                  <option value="blackboard">Slate Chalkboard</option>
                  <option value="blueprint">Police Blueprint</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-amber-900/30">
                <button
                  onClick={() => {
                    onAutoTidyBoard();
                    setIsOptionsOpen(false);
                  }}
                  className="w-full bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-200 p-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LayoutGrid size={12} /> Auto-Tidy Grid
                </button>

                {onExportBoardImage && (
                  <button
                    onClick={() => {
                      onExportBoardImage();
                      setIsOptionsOpen(false);
                    }}
                    className="w-full bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-200 p-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera size={12} /> Export Mind Place Snapshot
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diegetic Crimson Police Rubber Stamp Button */}
        <button
          onClick={onOpenAccusation}
          className="police-stamp cursor-pointer"
        >
          <ShieldAlert size={15} /> SUBMIT ACCUSATION
        </button>

      </div>

    </header>
  );
};
