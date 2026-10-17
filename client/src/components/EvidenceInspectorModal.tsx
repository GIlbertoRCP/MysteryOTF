import React, { useState } from 'react';
import { EvidenceItem } from '../types';
import { FileText, FlaskConical, X, Pin, Sparkles, Search, Sliders } from 'lucide-react';

interface EvidenceInspectorModalProps {
  item: EvidenceItem;
  onClose: () => void;
  onPin: (item: EvidenceItem) => void;
  isPinned: boolean;
}

export const EvidenceInspectorModal: React.FC<EvidenceInspectorModalProps> = ({
  item,
  onClose,
  onPin,
  isPinned
}) => {
  const [isUvActive, setIsUvActive] = useState(false);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="modal-overlay">
      <div
        className={`modal-content relative font-courier transition-all ${
          isUvActive
            ? 'bg-purple-950/90 border-purple-500 shadow-purple-500/20 text-purple-200'
            : isInverted
            ? 'bg-slate-900 border-cyan-500 text-cyan-200'
            : 'glass-panel border-amber-700/60 text-amber-100'
        }`}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-400 hover:text-white p-1.5 bg-black/60 rounded-full border border-amber-800/60 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-900/40 border border-amber-600/40 rounded-lg text-amber-300">
              {item.assignedRole === 'lead' ? <FileText size={24} /> : <FlaskConical size={24} />}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800/40">
                {item.tag} • EVIDENCE #{item.id}
              </span>
              <h2 className="text-xl font-bold font-typewriter text-amber-100 mt-1">
                {item.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Forensic Photo Filters Toolbar - Diegetic Stamped Tags */}
        <div className="flex items-center gap-2 mb-4 bg-black/50 p-2 rounded border border-amber-900/30 text-xs font-mono">
          <span className="text-amber-500 text-[10px] uppercase flex items-center gap-1">
            <Sliders size={12} /> LAB FILTERS:
          </span>

          <button
            onClick={() => setIsUvActive(!isUvActive)}
            className={`tag-button ${
              isUvActive ? 'bg-purple-900 border-purple-400 text-purple-100 font-bold' : ''
            }`}
          >
            <Sparkles size={12} /> UV Light
          </button>

          <button
            onClick={() => setIsMagnifierActive(!isMagnifierActive)}
            className={`tag-button ${
              isMagnifierActive ? 'bg-amber-800 border-amber-400 text-amber-100 font-bold' : ''
            }`}
          >
            <Search size={12} /> Magnifier
          </button>

          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`tag-button ${
              isInverted ? 'bg-cyan-900 border-cyan-400 text-cyan-100 font-bold' : ''
            }`}
          >
            Invert
          </button>

          <button
            onClick={() => setIsHighContrast(!isHighContrast)}
            className={`tag-button ${
              isHighContrast ? 'bg-yellow-900 border-yellow-400 text-yellow-100 font-bold' : ''
            }`}
          >
            Contrast
          </button>
        </div>

        {/* Body Content */}
        <div
          className={`space-y-4 my-4 p-4 rounded border text-xs leading-relaxed max-h-72 overflow-y-auto relative transition-all ${
            isHighContrast ? 'bg-black text-yellow-300 border-yellow-500 font-bold' : 'bg-black/50 border-amber-900/30 text-amber-200/90'
          }`}
        >
          <div>
            <h4 className="font-bold font-mono text-amber-400 uppercase text-[11px] mb-1">
              SUMMARY OVERVIEW:
            </h4>
            <p className="italic">{item.summary}</p>
          </div>

          <div className="pt-2 border-t border-amber-900/20">
            <h4 className="font-bold font-mono text-amber-400 uppercase text-[11px] mb-1">
              DETAILED INVESTIGATION FINDINGS:
            </h4>
            <p>{item.details}</p>
          </div>

          {/* UV Secret Ink Message Overlay */}
          {isUvActive && (
            <div className="p-3 bg-purple-900/50 border border-purple-400 rounded text-purple-200 font-mono text-[11px] animate-pulse">
              <span className="font-bold text-purple-300 uppercase">⚡ UV BLACKLIGHT REVEAL:</span>
              <p className="mt-1">
                "Fluorescent chemical residue #8841 detected. Trace sample matches specimen recovered from crime scene."
              </p>
            </div>
          )}

          {/* Magnifier Lens Effect */}
          {isMagnifierActive && (
            <div className="p-3 bg-amber-950/70 border border-amber-500 rounded font-mono text-[11px] text-amber-300 flex items-center gap-2">
              <Search size={16} />
              <span>MAGNIFIED RIDGE PATTERN: Loop index 14-B matches suspect profile database.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="tag-button"
          >
            CLOSE FILE
          </button>

          <button
            disabled={isPinned}
            onClick={() => {
              onPin(item);
              onClose();
            }}
            className={`pin-button ${
              isPinned ? 'bg-black/40 border-amber-950 text-amber-800 cursor-not-allowed' : ''
            }`}
          >
            <Pin size={14} /> {isPinned ? 'PINNED TO BOARD' : 'PIN TO CORKBOARD'}
          </button>
        </div>

      </div>
    </div>
  );
};
