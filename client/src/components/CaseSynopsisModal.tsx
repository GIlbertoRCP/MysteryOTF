import React, { useState } from 'react';
import { MysteryCase, EvidenceItem } from '../types';
import { X, MapPin, Clock, Briefcase } from 'lucide-react';

interface CaseSynopsisModalProps {
  mystery: MysteryCase;
  evidenceList: EvidenceItem[];
  placedCardIds: string[];
  onClose: () => void;
}

const TAG_COLORS: Record<string, { bg: string; border: string; text: string; stamp: string }> = {
  'Motive':        { bg: 'rgba(180,40,40,0.15)',  border: 'rgba(220,60,60,0.4)',  text: '#ff8080', stamp: 'MOTIVE'   },
  'Murder Weapon': { bg: 'rgba(120,40,180,0.15)', border: 'rgba(160,80,220,0.4)', text: '#c090ff', stamp: 'WEAPON'   },
  'Contradiction': { bg: 'rgba(40,100,180,0.15)', border: 'rgba(80,140,220,0.4)', text: '#80b8ff', stamp: 'CONTRA'   },
  'Fake Alibi':    { bg: 'rgba(40,160,100,0.15)', border: 'rgba(60,180,120,0.4)', text: '#80ffb8', stamp: 'ALIBI'    },
  'Timeline':      { bg: 'rgba(160,120,40,0.15)', border: 'rgba(200,160,60,0.4)', text: '#ffd880', stamp: 'TIMELINE' },
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  witness_statement: 'WIT. STMT',
  autopsy:          'AUTOPSY',
  toxicology:       'TOXICOL.',
  cctv_report:      'CCTV LOG',
  fingerprint:      'FINGERPR.',
  phone_log:        'PHONE LOG',
  ballistics:       'BALLISTIC',
};

export const CaseSynopsisModal: React.FC<CaseSynopsisModalProps> = ({
  mystery,
  evidenceList = [],
  placedCardIds = [],
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'suspects' | 'evidence' | 'notebook'>('overview');

  const getInitialNotes = () => {
    try {
      if (mystery?.id) {
        return localStorage.getItem(`notes-${mystery.id}`) ||
          'DETECTIVE NOTES & HYPOTHESES:\n- Suspect #1 alibi requires verification against CCTV.\n- Check toxicology report for compound match.';
      }
    } catch (e) {
      console.warn('localStorage unavailable', e);
    }
    return 'DETECTIVE NOTES & HYPOTHESES:\n- Suspect #1 alibi requires verification against CCTV.\n- Check toxicology report for compound match.';
  };

  const [notesText, setNotesText] = useState<string>(getInitialNotes);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSaveNotes = () => {
    try {
      if (mystery?.id) {
        localStorage.setItem(`notes-${mystery.id}`, notesText);
        setSavedStatus(true);
        setTimeout(() => setSavedStatus(false), 2000);
      }
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  };

  const victim   = mystery?.victim   || { name: 'Unknown', age: 0, occupation: 'Unknown', timeOfDeath: 'Unknown', location: 'Unknown' };
  const suspects = mystery?.suspects || [];
  const synopsis = mystery?.synopsis || 'Investigate the crime scene and identify the killer.';
  const caseTitle = mystery?.title   || 'Unsolved Case';

  const TABS = [
    { key: 'overview',  label: 'OVERVIEW' },
    { key: 'suspects',  label: 'SUSPECTS' },
    { key: 'evidence',  label: 'EVIDENCE' },
    { key: 'notebook',  label: 'NOTEBOOK' },
  ] as const;

  const placedCount      = evidenceList.filter(e => placedCardIds.includes(e.id)).length;
  const keyEvidenceCount = evidenceList.filter(e => e.isKeyEvidence).length;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="modal-overlay"
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0c0a06 0%, #14110a 60%, #0c0a06 100%)',
          border: '1px solid rgba(180,130,60,0.25)',
          borderRadius: '4px',
          width: '94vw',
          maxWidth: '1060px',
          maxHeight: '90vh',
          color: 'rgba(255,235,180,0.9)',
          boxShadow: '0 0 100px rgba(0,0,0,0.95), inset 0 0 60px rgba(0,0,0,0.3)',
        }}
      >

        {/* Case number banner */}
        <div
          className="flex items-center justify-between px-7 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(180,130,60,0.2)', background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="flex items-center gap-4">
            <div style={{ fontFamily: "'Special Elite', serif", color: 'rgba(180,130,60,0.55)', fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              Official Case Dossier
            </div>
            <div className="h-3 w-px" style={{ background: 'rgba(180,130,60,0.2)' }} />
            <div style={{ fontFamily: 'monospace', color: 'rgba(180,130,60,0.35)', fontSize: '9px' }}>
              {mystery?.id?.slice(-12).toUpperCase() || 'CASE-XXXXXX'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full border transition hover:bg-white/10 cursor-pointer"
            style={{ borderColor: 'rgba(180,130,60,0.25)', color: 'rgba(180,130,60,0.6)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Case title header */}
        <div className="px-7 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(180,130,60,0.12)' }}>
          <h2
            style={{ fontFamily: "'Special Elite', serif", fontSize: 'clamp(1.1rem, 2vw + 0.5rem, 1.55rem)', color: 'rgba(255,235,180,0.95)', lineHeight: 1.25 }}
          >
            {caseTitle}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#e74c3c', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', padding: '2px 10px', borderRadius: '2px' }}>
              OPEN INVESTIGATION
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(180,130,60,0.5)' }}>
              {placedCount}/{evidenceList.length} evidence pinned &middot; {keyEvidenceCount} key items
            </span>
          </div>
        </div>

        {/* Physical manila folder tab bar */}
        <div className="flex items-end px-7 pt-4 gap-1.5 shrink-0" style={{ borderBottom: '2px solid rgba(180,130,60,0.25)' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-6 py-2.5 transition cursor-pointer"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isActive ? 'rgba(255,235,180,0.95)' : 'rgba(180,130,60,0.45)',
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(180,130,60,0.18) 0%, rgba(180,130,60,0.1) 100%)'
                    : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${isActive ? 'rgba(180,130,60,0.4)' : 'rgba(180,130,60,0.12)'}`,
                  borderBottom: isActive ? '2px solid rgba(180,130,60,0.25)' : '1px solid rgba(180,130,60,0.12)',
                  marginBottom: isActive ? '-2px' : '0',
                  borderRadius: '2px 2px 0 0',
                }}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'rgba(180,130,60,0.25)' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              <div className="relative rounded overflow-hidden" style={{ border: '1px solid rgba(180,130,60,0.2)' }}>
                <div
                  className="h-36 flex items-end"
                  style={{
                    background: 'linear-gradient(135deg, #0a0806 0%, #1a1208 50%, #0a0806 100%)',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(180,130,60,0.15)',
                  }}
                >
                  <svg
                    viewBox="0 0 120 80"
                    className="absolute inset-0 opacity-[0.06]"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <ellipse cx="60" cy="35" rx="9" ry="10" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
                    <line x1="60" y1="45" x2="60" y2="64" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    <line x1="60" y1="50" x2="44" y2="60" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    <line x1="60" y1="50" x2="76" y2="56" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    <line x1="60" y1="64" x2="50" y2="76" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    <line x1="60" y1="64" x2="70" y2="76" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                  </svg>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'rgba(180,130,60,0.55)' }}>Crime Scene</div>
                    <div className="text-base font-bold" style={{ fontFamily: "'Special Elite', serif", color: 'rgba(255,235,180,0.85)' }}>{victim.location}</div>
                  </div>
                </div>

                <div className="p-5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,235,180,0.72)', fontFamily: "'Special Elite', serif" }}>
                    {synopsis}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,130,60,0.18)' }}>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgba(180,130,60,0.5)' }}>Victim Identification</div>
                  <div className="text-base font-bold mb-1.5" style={{ fontFamily: "'Special Elite', serif", color: 'rgba(255,235,180,0.95)' }}>{victim.name}</div>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'rgba(180,130,60,0.7)' }}>
                    <Briefcase size={10} /> {victim.occupation}
                  </div>
                  <div className="text-[10px]" style={{ color: 'rgba(180,130,60,0.45)' }}>Age {victim.age}</div>
                </div>

                <div className="p-5 rounded" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,130,60,0.18)' }}>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: 'rgba(180,130,60,0.5)' }}>Time &amp; Location</div>
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'rgba(255,235,180,0.85)', fontFamily: "'Special Elite', serif" }}>
                    <Clock size={12} /> {victim.timeOfDeath}
                  </div>
                  <div className="flex items-start gap-2 text-xs" style={{ color: 'rgba(180,130,60,0.7)' }}>
                    <MapPin size={10} className="shrink-0 mt-0.5" /> {victim.location}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUSPECTS LINEUP */}
          {activeTab === 'suspects' && (
            <div className="space-y-4">
              {suspects.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-stretch rounded overflow-hidden"
                  style={{ border: '1px solid rgba(180,130,60,0.18)' }}
                >
                  {/* Number placard */}
                  <div
                    className="w-12 flex items-center justify-center shrink-0 text-base font-bold"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(180,130,60,0.4)', fontFamily: 'monospace', borderRight: '1px solid rgba(180,130,60,0.12)' }}
                  >
                    {idx + 1}
                  </div>

                  {/* Avatar swatch */}
                  <div
                    className="w-20 shrink-0 flex items-center justify-center"
                    style={{ background: s.avatarColor + '15', borderRight: '1px solid rgba(180,130,60,0.12)' }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: s.avatarColor + '25', border: `1.5px solid ${s.avatarColor}55`, color: s.avatarColor }}
                    >
                      {s.name.charAt(0)}
                    </div>
                  </div>

                  {/* Name, role & bio */}
                  <div className="flex-1 px-5 py-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div className="text-base font-bold mb-1" style={{ fontFamily: "'Special Elite', serif", color: 'rgba(255,235,180,0.95)' }}>{s.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(180,130,60,0.55)' }}>{s.role}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'rgba(180,130,60,0.7)' }}>{s.bio}</div>
                  </div>

                  {/* Alibi column */}
                  <div className="w-52 shrink-0 px-4 py-4 border-l flex flex-col justify-center" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(180,130,60,0.12)' }}>
                    <div className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(180,130,60,0.4)' }}>Stated Alibi</div>
                    <p className="text-xs italic leading-relaxed" style={{ color: 'rgba(255,235,180,0.62)', fontFamily: "'Special Elite', serif" }}>
                      "{s.statedAlibi.length > 100 ? s.statedAlibi.slice(0, 100) + '...' : s.statedAlibi}"
                    </p>
                  </div>

                  {/* Status stamp */}
                  <div
                    className="w-24 shrink-0 flex items-center justify-center border-l"
                    style={{ background: 'rgba(231,76,60,0.06)', borderColor: 'rgba(231,76,60,0.2)' }}
                  >
                    <div
                      className="text-[8px] font-mono uppercase tracking-wider text-center"
                      style={{
                        color: '#e74c3c',
                        border: '1.5px solid rgba(231,76,60,0.4)',
                        borderRadius: '2px',
                        padding: '4px 6px',
                        transform: 'rotate(-5deg)',
                        lineHeight: 1.4,
                      }}
                    >
                      UNDER<br />SUSPICION
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(180,130,60,0.5)' }}>
                  Master Evidence Archive &mdash; {evidenceList.length} Items
                </span>
                <div className="flex items-center gap-4 text-[9px] font-mono" style={{ color: 'rgba(180,130,60,0.4)' }}>
                  <span>Lead ({evidenceList.filter(e => e.assignedRole === 'lead').length})</span>
                  <span>Analyst ({evidenceList.filter(e => e.assignedRole === 'analyst').length})</span>
                </div>
              </div>

              {evidenceList.map((item) => {
                const isPlaced = placedCardIds.includes(item.id);
                const tag = TAG_COLORS[item.tag] || TAG_COLORS['Timeline'];
                const typeLabel = EVIDENCE_TYPE_LABELS[item.type] || item.type.toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3.5 rounded"
                    style={{
                      background: isPlaced ? 'rgba(180,130,60,0.07)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${isPlaced ? 'rgba(180,130,60,0.28)' : 'rgba(180,130,60,0.12)'}`,
                    }}
                  >
                    {/* Tag stamp */}
                    <div
                      className="shrink-0 text-[8px] font-mono uppercase w-16 text-center py-1.5 rounded"
                      style={{
                        background: tag.bg,
                        border: `1px solid ${tag.border}`,
                        color: tag.text,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {tag.stamp}
                    </div>

                    {/* Role pill */}
                    <div className="shrink-0">
                      <div
                        className="text-[8px] font-mono uppercase px-2 py-1 rounded"
                        style={{
                          background: item.assignedRole === 'lead' ? 'rgba(231,76,60,0.12)' : 'rgba(52,152,219,0.12)',
                          border: `1px solid ${item.assignedRole === 'lead' ? 'rgba(231,76,60,0.3)' : 'rgba(52,152,219,0.3)'}`,
                          color: item.assignedRole === 'lead' ? '#ff8080' : '#80b8ff',
                        }}
                      >
                        {item.assignedRole === 'lead' ? 'LEAD' : 'ANALYST'}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ fontFamily: "'Special Elite', serif", color: item.isKeyEvidence ? 'rgba(255,235,180,0.98)' : 'rgba(255,235,180,0.72)' }}>
                        {item.isKeyEvidence && <span className="text-[9px] mr-2 font-mono" style={{ color: '#e74c3c' }}>KEY</span>}
                        {item.title}
                      </div>
                      <div className="text-[9px] mt-1 font-mono" style={{ color: 'rgba(180,130,60,0.4)' }}>{typeLabel}</div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {isPlaced ? (
                        <div
                          className="text-[8px] font-mono uppercase px-2.5 py-1 rounded"
                          style={{ background: 'rgba(60,180,80,0.1)', border: '1px solid rgba(60,180,80,0.35)', color: '#80ffb8' }}
                        >
                          PINNED
                        </div>
                      ) : (
                        <div className="text-[8px] font-mono" style={{ color: 'rgba(180,130,60,0.28)' }}>
                          inventory
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* NOTEBOOK */}
          {activeTab === 'notebook' && (
            <div className="relative">
              <div
                className="relative rounded overflow-hidden"
                style={{ background: '#faf6e4', border: '1px solid rgba(180,130,60,0.3)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.1)' }}
              >
                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 left-14" style={{ width: '1px', background: 'rgba(220,80,60,0.5)', zIndex: 1 }} />

                {/* Spiral binding holes */}
                <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-around items-center py-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ background: '#d4c9a0', border: '1px solid #b8ad8a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }} />
                  ))}
                </div>

                {/* Save button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 rounded text-[9px] font-mono uppercase tracking-wider transition cursor-pointer"
                    style={{
                      background: savedStatus ? 'rgba(60,180,80,0.15)' : 'rgba(180,130,60,0.12)',
                      border: `1px solid ${savedStatus ? 'rgba(60,180,80,0.4)' : 'rgba(180,130,60,0.3)'}`,
                      color: savedStatus ? '#80ffb8' : 'rgba(120,100,60,0.85)',
                    }}
                  >
                    {savedStatus ? 'SAVED' : 'SAVE'}
                  </button>
                </div>

                {/* Lined textarea */}
                <div className="pl-18 pr-5 pt-5 pb-5 relative" style={{ paddingLeft: '72px' }}>
                  <div
                    className="absolute top-0 right-0 bottom-0 pointer-events-none"
                    style={{
                      left: '72px',
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(180,160,100,0.25) 27px, rgba(180,160,100,0.25) 28px)',
                      backgroundSize: '100% 28px',
                    }}
                  />
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={16}
                    className="w-full bg-transparent relative z-10 resize-none focus:outline-none"
                    style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: '13px',
                      lineHeight: '28px',
                      color: '#1a1400',
                      letterSpacing: '0.02em',
                    }}
                    placeholder="Write your observations here..."
                  />
                </div>
              </div>

              {/* Tape */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded"
                style={{ background: 'rgba(255,235,150,0.4)', border: '1px solid rgba(180,160,80,0.3)' }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
