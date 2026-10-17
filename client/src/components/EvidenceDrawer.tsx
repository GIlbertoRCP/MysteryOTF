import React, { useState } from 'react';
import { EvidenceItem, Role } from '../types';
import { FolderOpen, Pin, Eye, ChevronUp, ChevronDown, FileText, FlaskConical, Search, Clock, ListFilter, BookOpen } from 'lucide-react';

interface EvidenceDrawerProps {
  evidenceList: EvidenceItem[];
  placedCardIds: string[];
  myRole: Role;
  onPinToBoard: (item: EvidenceItem) => void;
  onInspectItem: (item: EvidenceItem) => void;
  onOpenCaseFile?: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidenceList,
  placedCardIds,
  myRole,
  onPinToBoard,
  onInspectItem,
  onOpenCaseFile
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [isTimelineView, setIsTimelineView] = useState(false);

  const myEvidence = evidenceList.filter(e => e.assignedRole === myRole);

  const filteredEvidence = myEvidence.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'ALL' || item.tag === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  const categories = ['ALL', 'Motive', 'Contradiction', 'Murder Weapon', 'Fake Alibi', 'Timeline'];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
      
      {/* Drawer Toggle Header Button - Metal Cabinet Handle Style */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#1c222c] border-t-2 border-x-2 border-[#3a475a] text-amber-200 font-mono text-xs px-6 py-2 rounded-t-xl flex items-center gap-2 shadow-2xl hover:bg-[#252e3d] transition"
        >
          <FolderOpen size={15} className="text-amber-400" />
          <span className="font-bold tracking-wider">FILING CABINET: EVIDENCE ARCHIVE ({myEvidence.length})</span>
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {onOpenCaseFile && (
          <button
            onClick={onOpenCaseFile}
            className="bg-[#2c1d11] border-t-2 border-x-2 border-[#855b08] text-amber-200 font-mono text-xs px-4 py-2 rounded-t-xl flex items-center gap-1.5 shadow-2xl hover:bg-[#3d291b] transition"
          >
            <BookOpen size={14} className="text-amber-400" /> FULL CASE BINDER
          </button>
        )}
      </div>

      {/* Drawer Content Area */}
      {isOpen && (
        <div className="pointer-events-auto w-full max-w-6xl bg-[#12161f] border-t-2 border-[#3a475a] p-4 shadow-2xl backdrop-blur-md">
          
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-amber-900/30 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-typewriter text-xs uppercase tracking-wider">
              {myRole === 'lead' ? <FileText size={16} /> : <FlaskConical size={16} />}
              <span>{myRole === 'lead' ? 'Lead Detective Field Files' : 'Forensic Analyst Lab Inventory'}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-amber-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter clues..."
                  className="bg-black/60 border border-amber-800/50 rounded-full pl-8 pr-3 py-1 text-xs text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-400 font-mono w-40"
                />
              </div>

              <button
                onClick={() => setIsTimelineView(!isTimelineView)}
                className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1 border transition ${
                  isTimelineView
                    ? 'bg-amber-900 border-amber-400 text-amber-100'
                    : 'bg-black/40 border-amber-900/40 text-amber-400 hover:border-amber-700'
                }`}
              >
                <Clock size={12} /> {isTimelineView ? 'Chronology Mode' : 'Grid Mode'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[11px] font-mono">
            <span className="text-amber-600 uppercase flex items-center gap-1 mr-1">
              <ListFilter size={10} /> Filter:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedTagFilter(cat)}
                className={`px-2.5 py-0.5 rounded-full border transition ${
                  selectedTagFilter === cat
                    ? 'bg-amber-700 border-amber-400 text-amber-100 font-bold'
                    : 'bg-black/40 border-amber-900/40 text-amber-400/60 hover:text-amber-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1">
            {filteredEvidence.map((item) => {
              const isAlreadyPlaced = placedCardIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-[#ebdcb9] text-[#2c1d11] p-3 rounded-lg flex flex-col justify-between shadow-lg transition-all ${
                    isAlreadyPlaced 
                      ? 'opacity-50 border border-amber-900/30' 
                      : 'border-2 border-[#b8a686] hover:border-[#d4af37]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase bg-[#2c1d11] text-amber-200 px-1.5 py-0.5 rounded">
                        {item.tag}
                      </span>
                      {isAlreadyPlaced && (
                        <span className="text-[10px] text-green-800 font-mono font-bold flex items-center gap-1">
                          ✓ On Board
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-typewriter font-bold text-[#1a0f07] line-clamp-1 mt-1">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-[#3d291b] font-sans line-clamp-2 mt-1">
                      {item.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#c7b28f]">
                    <button
                      onClick={() => onInspectItem(item)}
                      className="flex-1 bg-[#2c1d11] hover:bg-[#3d291b] text-amber-100 font-mono text-[11px] py-1 px-2 rounded flex items-center justify-center gap-1 transition"
                    >
                      <Eye size={12} /> Inspect
                    </button>

                    <button
                      disabled={isAlreadyPlaced}
                      onClick={() => onPinToBoard(item)}
                      className={`flex-1 font-mono text-[11px] py-1 px-2 rounded flex items-center justify-center gap-1 transition ${
                        isAlreadyPlaced
                          ? 'bg-black/20 text-amber-900 cursor-not-allowed'
                          : 'bg-[#c0392b] hover:bg-[#d63031] text-white font-bold'
                      }`}
                    >
                      <Pin size={12} /> Pin
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
