import React, { useState } from 'react';
import { MysteryCase, Suspect } from '../types';
import { X, Mic, ChevronRight, RotateCcw, Shield, AlertTriangle } from 'lucide-react';

interface InterrogationModalProps {
  mystery: MysteryCase;
  onClose: () => void;
}

// Per-theme interrogation questions
const THEME_QUESTIONS: Record<string, { question: string; killerAnswer: string; innocentAnswer: string }[]> = {
  gothic: [
    {
      question: "Where exactly were you between 10:00 PM and 10:30 PM on the night of the murder?",
      killerAnswer: "I was dining alone at the Grand Hotel dining room the entire evening. The staff must have seen me there.",
      innocentAnswer: "I attended the public lecture at Town Hall until well past 10:45 PM. The attendance register has my signature."
    },
    {
      question: "Describe your personal or financial relationship with the deceased.",
      killerAnswer: "We had a professional disagreement over certain business holdings. Nothing unusual. Strictly professional.",
      innocentAnswer: "I managed routine affairs for the household. Everything was transparent and above board. Nothing to hide."
    },
    {
      question: "How do you account for your physical traces found at the crime scene?",
      killerAnswer: "I stopped by in the early afternoon to deliver some correspondence files. Any traces are from that visit, I assure you.",
      innocentAnswer: "I haven't been in that particular room in several days. Any trace must be from a prior visit at least a week ago."
    }
  ],
  cyber: [
    {
      question: "Can you verify your biometric login timestamps between 10:00 PM and 10:20 PM?",
      killerAnswer: "My session logs show I was in the Sub-Level 2 Lounge. The biometric system must have a calibration error.",
      innocentAnswer: "I was logged into the Biometric Lounge the entire evening. Three colleagues can confirm my presence there."
    },
    {
      question: "What was the nature of your access to the victim's research terminal?",
      killerAnswer: "Standard level access, same as any senior engineer. I never accessed anything outside my clearance.",
      innocentAnswer: "I had read-only access to shared project files only. The access log will confirm I touched nothing classified."
    },
    {
      question: "The AI flagged an unauthorized corridor scan near your badge. Explain that.",
      killerAnswer: "Sensor glitches happen constantly in Sector 7. I filed a bug report on that exact scanner last month.",
      innocentAnswer: "I wasn't anywhere near that corridor. My session was active in the lounge the entire time — check the ping logs."
    }
  ],
  opera: [
    {
      question: "Where were you when the final curtain fell, between 10:00 PM and 10:25 PM?",
      killerAnswer: "I was rehearsing privately in the Maestro's parlour. I always use that time to decompress after a performance.",
      innocentAnswer: "I was at the post-performance press gathering in the Grand Foyer. Ask the critics who interviewed me."
    },
    {
      question: "Describe your professional relationship with the victim.",
      killerAnswer: "We had creative differences, as all artists do. But I respected their position. We were colleagues, nothing more.",
      innocentAnswer: "A perfectly civil working relationship. We had our disagreements but I would never take things that far."
    },
    {
      question: "Two stagehands placed you near the dressing room corridor at 10:08 PM. Respond.",
      killerAnswer: "Stagehands see what they want to see. The backstage corridors are busy after a show. They are mistaken.",
      innocentAnswer: "Impossible. I was in the Foyer. If they saw someone near the dressing room, it was not me."
    }
  ],
  casino: [
    {
      question: "Casino floor cameras show your private elevator exit at 10:01 PM. Where did you go?",
      killerAnswer: "I stepped out briefly for a phone call. The Sky Lounge gets terrible signal. I was back within minutes.",
      innocentAnswer: "I was at Table 14 the entire evening. Three croupiers and the pit boss can confirm that."
    },
    {
      question: "Describe your recent dealings with the victim.",
      killerAnswer: "A few disputed transactions, nothing serious. These things happen in business. It was being handled through lawyers.",
      innocentAnswer: "Strictly professional. We had a clean working relationship. No outstanding disputes whatsoever."
    },
    {
      question: "An encrypted USB was found in a chip traced to your table. Care to explain?",
      killerAnswer: "I don't know anything about that. Someone could have planted it. Chips change hands dozens of times a night.",
      innocentAnswer: "I never touched that chip. I play strictly at the tables and I don't carry data devices at work."
    }
  ],
  express: [
    {
      question: "The conductor's log places you in Compartment Car 3 at 10:06 PM. Explain that entry.",
      killerAnswer: "The conductor makes clerical errors constantly. I was in the dining car the entire evening eating supper.",
      innocentAnswer: "I was in the dining car from 9:40 through to after 11. The steward served me directly. Check the receipt."
    },
    {
      question: "What was the nature of your correspondence with the victim?",
      killerAnswer: "Entirely routine diplomatic matters. Nothing that would give anyone motive for anything.",
      innocentAnswer: "We had a cordial professional relationship. I was aware of no sensitive disputes between us."
    },
    {
      question: "A fellow passenger reported hearing voices from Compartment 3-B near your reported position.",
      killerAnswer: "The walls on this train are paper thin. They probably heard the dining car through the paneling.",
      innocentAnswer: "I can't speak to what others heard. I was nowhere near that compartment at that time."
    }
  ]
};

const SUSPECT_PORTRAIT_COLORS: Record<string, string> = {
  '#e74c3c': 'from-red-950 to-red-900 border-red-600',
  '#3498db': 'from-blue-950 to-blue-900 border-blue-600',
  '#2ecc71': 'from-emerald-950 to-emerald-900 border-emerald-600',
  '#f39c12': 'from-amber-950 to-amber-900 border-amber-600',
  '#9b59b6': 'from-purple-950 to-purple-900 border-purple-600',
  '#34495e': 'from-slate-950 to-slate-900 border-slate-500',
};

export const InterrogationModal: React.FC<InterrogationModalProps> = ({ mystery, onClose }) => {
  const suspects = mystery?.suspects || [];
  const themeKey = (mystery?.id?.includes('seed') ? 'gothic' : 'gothic'); // fallback; theme not in type yet
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>(suspects[0]?.id || '');
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, number>>({});

  const activeSuspect = suspects.find(s => s.id === selectedSuspectId) || suspects[0];

  // Detect theme from mystery title
  const detectTheme = () => {
    const title = mystery?.title?.toLowerCase() || '';
    if (title.includes('sector') || title.includes('cyber') || title.includes('neural') || title.includes('ai')) return 'cyber';
    if (title.includes('opera') || title.includes('aria') || title.includes('maestro')) return 'opera';
    if (title.includes('casino') || title.includes('roulette') || title.includes('vault')) return 'casino';
    if (title.includes('express') || title.includes('orient') || title.includes('diplomatic')) return 'express';
    return 'gothic';
  };

  const theme = detectTheme();
  const questions = THEME_QUESTIONS[theme] || THEME_QUESTIONS.gothic;

  const revealedCount = revealedQuestions[activeSuspect?.id || ''] ?? -1;

  const handleRevealNext = () => {
    if (!activeSuspect) return;
    setRevealedQuestions(prev => ({
      ...prev,
      [activeSuspect.id]: Math.min((prev[activeSuspect.id] ?? -1) + 1, questions.length - 1)
    }));
  };

  const handleReset = () => {
    if (!activeSuspect) return;
    setRevealedQuestions(prev => ({ ...prev, [activeSuspect.id]: -1 }));
  };

  const handleSwitchSuspect = (id: string) => {
    setSelectedSuspectId(id);
  };

  const portraitGradient = SUSPECT_PORTRAIT_COLORS[activeSuspect?.avatarColor || '#34495e'] || 'from-slate-950 to-slate-900 border-slate-500';
  const allAnswered = revealedCount >= questions.length - 1;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="modal-overlay"
    >
      <div
        className="relative flex flex-col overflow-hidden text-amber-100"
        style={{
          background: 'linear-gradient(160deg, #0a0806 0%, #12100a 60%, #0a0806 100%)',
          border: '1px solid rgba(180,130,60,0.25)',
          borderRadius: '4px',
          width: '94vw',
          maxWidth: '1040px',
          maxHeight: '90vh',
          boxShadow: '0 0 80px rgba(0,0,0,0.9), inset 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top chrome bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ borderColor: 'rgba(180,130,60,0.2)', background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(180,130,60,0.7)' }}>
              POLICE INTERROGATION — LIVE SESSION RECORDING
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full border transition hover:bg-white/10 cursor-pointer"
            style={{ borderColor: 'rgba(180,130,60,0.3)', color: 'rgba(180,130,60,0.7)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Suspect selector strip */}
        <div className="px-6 pt-4 pb-4 border-b shrink-0 overflow-x-auto" style={{ borderColor: 'rgba(180,130,60,0.15)' }}>
          <div className="flex gap-3 min-w-max">
            {suspects.map((s) => {
              const isActive = s.id === selectedSuspectId;
              const answered = (revealedQuestions[s.id] ?? -1) >= 0;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSwitchSuspect(s.id)}
                  className="flex items-center gap-3 px-5 py-3 rounded transition shrink-0 cursor-pointer"
                  style={{
                    background: isActive ? 'rgba(180,130,60,0.15)' : 'rgba(0,0,0,0.4)',
                    border: `1px solid ${isActive ? 'rgba(180,130,60,0.6)' : 'rgba(180,130,60,0.1)'}`,
                    minWidth: '148px'
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: s.avatarColor + '33', border: `1px solid ${s.avatarColor}66`, color: s.avatarColor }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: isActive ? 'rgba(255,235,180,1)' : 'rgba(180,130,60,0.6)', fontFamily: "'Special Elite', serif" }}>
                      {s.name.split(' ').slice(-1)[0]}
                    </div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(180,130,60,0.45)' }}>{s.role}</div>
                  </div>
                  {answered && (
                    <div className="w-2 h-2 rounded-full ml-auto shrink-0" style={{ background: '#e74c3c' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main split layout */}
        {activeSuspect && (
          <div className="flex flex-1 overflow-hidden">

            {/* LEFT — Suspect Portrait Panel */}
            <div className="w-72 shrink-0 flex flex-col border-r p-6 gap-5" style={{ borderColor: 'rgba(180,130,60,0.15)', background: 'rgba(0,0,0,0.3)' }}>

              {/* Mugshot frame */}
              <div className="relative">
                <div
                  className={`w-full aspect-[3/4] rounded bg-gradient-to-b ${portraitGradient} border-2 flex flex-col items-center justify-center gap-3`}
                  style={{ fontFamily: "'Special Elite', serif" }}
                >
                  {/* Procedural silhouette */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl font-bold" style={{ borderColor: activeSuspect.avatarColor, color: activeSuspect.avatarColor, background: activeSuspect.avatarColor + '22' }}>
                      {activeSuspect.name.charAt(0)}
                    </div>
                    {/* Role badge */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#1a1008', border: `1px solid ${activeSuspect.avatarColor}` }}>
                      {activeSuspect.role.charAt(0)}
                    </div>
                  </div>

                  <div className="text-center px-3">
                    <div className="text-sm font-bold leading-snug" style={{ color: 'rgba(255,235,180,0.95)', fontFamily: "'Special Elite', serif" }}>{activeSuspect.name}</div>
                    <div className="text-[10px] mt-1" style={{ color: 'rgba(180,130,60,0.65)' }}>{activeSuspect.role}</div>
                  </div>

                  {/* Height ruler lines on left side */}
                  <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-2">
                    {[6, 5, 4, 3].map(ft => (
                      <div key={ft} className="flex items-center gap-0.5">
                        <div className="w-2 h-px" style={{ background: 'rgba(180,130,60,0.4)' }} />
                        <span className="text-[7px]" style={{ color: 'rgba(180,130,60,0.3)' }}>{ft}'</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking number strip */}
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[8px] font-mono" style={{ color: 'rgba(180,130,60,0.4)' }}>BOOKING #{activeSuspect.id.toUpperCase()}</span>
                  <span className="text-[8px] font-mono" style={{ color: 'rgba(180,130,60,0.4)' }}>CASE #{mystery.id?.slice(-6) || '??????'}</span>
                </div>
              </div>

              {/* Stated alibi card */}
              <div className="rounded p-4 leading-relaxed" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(180,130,60,0.18)' }}>
                <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(180,130,60,0.55)' }}>Stated Alibi on File</div>
                <p className="text-xs italic leading-relaxed" style={{ color: 'rgba(255,235,180,0.75)', fontFamily: "'Special Elite', serif" }}>
                  "{activeSuspect.statedAlibi}"
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded" style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)' }}>
                <AlertTriangle size={13} style={{ color: '#e74c3c' }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#e74c3c' }}>Under Active Suspicion</span>
              </div>
            </div>

            {/* RIGHT — Interrogation Transcript Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Transcript header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(180,130,60,0.15)' }}>
                <Mic size={15} style={{ color: 'rgba(231,76,60,0.8)' }} />
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(180,130,60,0.7)' }}>
                  Live Transcript — {activeSuspect.name}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  {revealedCount >= 0 && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
                      style={{ border: '1px solid rgba(180,130,60,0.2)', color: 'rgba(180,130,60,0.55)' }}
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                  <span className="text-[10px] font-mono" style={{ color: 'rgba(180,130,60,0.4)' }}>
                    {Math.max(0, revealedCount + 1)}/{questions.length} QUESTIONS
                  </span>
                </div>
              </div>

              {/* Transcript scroll area */}
              <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

                {revealedCount < 0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-4" style={{ color: 'rgba(180,130,60,0.3)' }}>
                    <Shield size={36} />
                    <p className="text-sm font-mono text-center" style={{ color: 'rgba(180,130,60,0.4)' }}>Press the button below to begin the interrogation session.</p>
                  </div>
                )}

                {questions.slice(0, revealedCount + 1).map((q, idx) => (
                  <div key={idx} className="space-y-3">

                    {/* Detective question */}
                    <div className="flex items-start gap-4">
                      <div className="text-[9px] font-mono mt-1.5 shrink-0 uppercase tracking-wider" style={{ color: 'rgba(180,130,60,0.45)' }}>
                        DET.
                      </div>
                      <div
                        className="flex-1 px-4 py-3 rounded-br-lg rounded-tr-lg rounded-bl-sm"
                        style={{
                          background: 'rgba(180,130,60,0.08)',
                          border: '1px solid rgba(180,130,60,0.22)',
                          color: 'rgba(255,235,180,0.95)',
                          fontFamily: "'Special Elite', serif",
                          fontSize: '13px',
                          lineHeight: '1.6',
                        }}
                      >
                        {q.question}
                      </div>
                    </div>

                    {/* Suspect response */}
                    <div className="flex items-start gap-4 justify-end">
                      <div
                        className="px-4 py-3 rounded-bl-lg rounded-tl-lg rounded-br-sm italic"
                        style={{
                          background: 'rgba(0,0,0,0.55)',
                          border: '1px solid rgba(180,130,60,0.15)',
                          color: 'rgba(255,235,180,0.78)',
                          fontFamily: "'Special Elite', serif",
                          fontSize: '13px',
                          lineHeight: '1.6',
                          maxWidth: '82%',
                          marginLeft: 'auto'
                        }}
                      >
                        "{activeSuspect.isKiller ? q.killerAnswer : q.innocentAnswer}"
                      </div>
                      <div className="text-[9px] font-mono mt-1.5 shrink-0 uppercase tracking-wider" style={{ color: activeSuspect.avatarColor + 'bb' }}>
                        SUS.
                      </div>
                    </div>

                  </div>
                ))}

                {/* Separator */}
                {revealedCount >= 0 && !allAnswered && (
                  <div className="flex items-center gap-3 py-1" style={{ color: 'rgba(180,130,60,0.25)' }}>
                    <div className="flex-1 h-px" style={{ background: 'rgba(180,130,60,0.1)' }} />
                    <span className="text-[9px] font-mono uppercase tracking-widest">NEXT QUESTION PENDING</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(180,130,60,0.1)' }} />
                  </div>
                )}

                {allAnswered && (
                  <div className="text-center py-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-4 py-1.5 rounded" style={{ color: 'rgba(180,130,60,0.55)', border: '1px solid rgba(180,130,60,0.2)' }}>
                      Session Complete — All Questions Asked
                    </span>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="px-6 py-5 border-t shrink-0" style={{ borderColor: 'rgba(180,130,60,0.15)', background: 'rgba(0,0,0,0.4)' }}>
                <button
                  onClick={handleRevealNext}
                  disabled={allAnswered}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded font-mono uppercase tracking-widest transition cursor-pointer"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    background: allAnswered ? 'rgba(0,0,0,0.3)' : 'rgba(180,130,60,0.14)',
                    border: `1px solid ${allAnswered ? 'rgba(180,130,60,0.1)' : 'rgba(180,130,60,0.5)'}`,
                    color: allAnswered ? 'rgba(180,130,60,0.25)' : 'rgba(255,235,180,0.9)',
                    cursor: allAnswered ? 'not-allowed' : 'pointer'
                  }}
                >
                  {allAnswered ? (
                    'All Lines of Questioning Exhausted'
                  ) : revealedCount < 0 ? (
                    <>BEGIN INTERROGATION <ChevronRight size={15} /></>
                  ) : (
                    <>CONTINUE QUESTIONING <ChevronRight size={15} /></>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
