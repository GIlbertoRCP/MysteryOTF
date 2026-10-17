import React, { useState } from 'react';
import { BoardString } from '../types';
import { X, GitCommit } from 'lucide-react';

interface StringTagModalProps {
  onConfirm: (label: BoardString['label'], color?: string) => void;
  onCancel: () => void;
}

export const StringTagModal: React.FC<StringTagModalProps> = ({ onConfirm, onCancel }) => {
  const [selectedTag, setSelectedTag] = useState<BoardString['label']>('Suspicious Link');
  const [customColor, setCustomColor] = useState<string>('#d63031');

  const options: { label: BoardString['label']; desc: string; defaultColor: string }[] = [
    { label: 'Suspicious Link', desc: 'Crimson Thread: Links suspect to crime scene or victim', defaultColor: '#d63031' },
    { label: 'Motive', desc: 'Gold Thread: Links financial benefit or blackmail evidence', defaultColor: '#f1c40f' },
    { label: 'Contradiction', desc: 'Cyan Thread: Exposes conflicting alibis or CCTV timestamps', defaultColor: '#00cec9' },
    { label: 'Alibi', desc: 'Green Thread: Proves suspect presence elsewhere during murder', defaultColor: '#2ecc71' }
  ];

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} className="modal-overlay">
      <div className="modal-content max-w-md font-courier text-amber-100 relative space-y-4">
        
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-amber-400 hover:text-white p-1 rounded-full bg-black/40"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 border-b border-amber-900/40 pb-2">
          <GitCommit size={20} className="text-amber-400" />
          <h3 className="font-bold font-typewriter text-lg text-amber-100">
            CONNECT THREAD DEDUCTION
          </h3>
        </div>

        <p className="text-xs text-amber-300/80">
          Select the investigative relationship to connect these two evidence pins:
        </p>

        <div className="space-y-2">
          {options.map((opt) => (
            <div
              key={opt.label}
              onClick={() => {
                setSelectedTag(opt.label);
                setCustomColor(opt.defaultColor);
              }}
              className={`p-3 rounded border cursor-pointer transition ${
                selectedTag === opt.label
                  ? 'bg-amber-950 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-black/40 border-amber-900/30 text-amber-400/80 hover:bg-black/60'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-white/40"
                    style={{ backgroundColor: opt.defaultColor }}
                  />
                  {opt.label.toUpperCase()}
                </span>
                {selectedTag === opt.label && (
                  <span className="text-[10px] text-amber-300">SELECTED ✓</span>
                )}
              </div>
              <p className="text-[11px] text-amber-200/70 mt-1 pl-5">
                {opt.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="tag-button"
          >
            CANCEL
          </button>

          <button
            onClick={() => onConfirm(selectedTag, customColor)}
            className="pin-button"
          >
            CONNECT THREAD
          </button>
        </div>

      </div>
    </div>
  );
};
