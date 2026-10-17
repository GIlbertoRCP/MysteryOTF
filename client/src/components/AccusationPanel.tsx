import React, { useState } from 'react';
import { MysteryCase, EvidenceItem, AccusationSubmission, Role } from '../types';
import { ShieldAlert, Award, RotateCcw, AlertTriangle, UserCheck, Star, GitBranch } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundFx } from '../utils/audio';
import { TypewriterText } from './TypewriterText';

interface AccusationPanelProps {
  mystery: MysteryCase;
  evidenceList: EvidenceItem[];
  myRole: Role;
  onClose: () => void;
  onSubmitAccusation: (submission: AccusationSubmission) => void;
  result?: {
    correct: boolean;
    score: number;
    feedback: string[];
    officialSummary: string;
  };
}

export const AccusationPanel: React.FC<AccusationPanelProps> = ({
  mystery,
  evidenceList,
  myRole,
  onClose,
  onSubmitAccusation,
  result
}) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>(mystery.suspects[0]?.id || '');
  const [motiveEvId, setMotiveEvId] = useState<string>(evidenceList[0]?.id || '');
  const [weaponEvId, setWeaponEvId] = useState<string>(evidenceList[1]?.id || '');
  const [alibiEvId, setAlibiEvId] = useState<string>(evidenceList[2]?.id || '');
  const [submittedLocal, setSubmittedLocal] = useState(false);

  React.useEffect(() => {
    if (result) {
      soundFx.playAccusationGong();
      if (result.correct) {
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.55 }
        });
      }
    }
  }, [result]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspectId || !motiveEvId || !weaponEvId || !alibiEvId) return;

    setSubmittedLocal(true);
    onSubmitAccusation({
      suspectId: selectedSuspectId,
      motiveEvidenceId: motiveEvId,
      weaponEvidenceId: weaponEvId,
      alibiEvidenceId: alibiEvId
    });
  };

  const getRankBadge = (score: number) => {
    if (score >= 100) return { rank: 'S-RANK MASTER DETECTIVE', color: 'text-amber-400 border-amber-400 bg-amber-950/60' };
    if (score >= 75) return { rank: 'A-RANK SENIOR SLEUTH', color: 'text-blue-400 border-blue-400 bg-blue-950/60' };
    if (score >= 50) return { rank: 'B-RANK INVESTIGATOR', color: 'text-yellow-400 border-yellow-400 bg-yellow-950/60' };
    return { rank: 'C-RANK JUNIOR CADET', color: 'text-red-400 border-red-400 bg-red-950/60' };
  };

  const solution = mystery.solutionGraph;
  const motiveItem = evidenceList.find(e => e.id === solution.motiveEvidenceId);
  const weaponItem = evidenceList.find(e => e.id === solution.weaponEvidenceId);
  const alibiItem = evidenceList.find(e => e.id === solution.alibiContradictionEvidenceId);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="modal-overlay">
      <div className="modal-content relative text-amber-100 font-courier max-w-4xl">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-500 hover:text-amber-200 text-xl font-bold font-mono"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-red-950 border border-red-600/60 px-4 py-1 rounded-full text-red-400 text-xs font-mono uppercase tracking-widest mb-2">
            <ShieldAlert size={14} className="animate-pulse" /> Official Case File Submission
          </div>
          <h2 className="text-3xl font-black font-typewriter text-amber-100">
            THE ACCUSATION CHAMBER
          </h2>
          <p className="text-xs text-amber-300/70 mt-1">
            Both investigators must submit their consensus logic chain to issue the arrest warrant.
          </p>
        </div>

        {/* CASE RESULT OVERLAY */}
        {result ? (
          <div className="space-y-6 text-center">
            <div className={`p-6 rounded-lg border ${result.correct ? 'bg-green-950/40 border-green-500' : 'bg-red-950/40 border-red-500'}`}>
              {result.correct ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/40 text-green-400 mb-2">
                    <Award size={36} />
                  </div>
                  
                  {(() => {
                    const badge = getRankBadge(result.score);
                    return (
                      <div className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full border font-mono text-xs font-bold uppercase ${badge.color}`}>
                        <Star size={14} className="fill-current" /> {badge.rank} ({result.score}%)
                      </div>
                    );
                  })()}

                  <h3 className="text-3xl font-black font-typewriter text-green-400 mt-2">
                    CASE SOLVED! ARREST WARRANT ISSUED!
                  </h3>
                  
                  <div className="text-sm text-green-200 max-w-xl mx-auto min-h-16 pt-2">
                    <TypewriterText text={result.officialSummary} speed={20} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/40 text-red-400 mb-2">
                    <AlertTriangle size={36} />
                  </div>

                  <h3 className="text-3xl font-black font-typewriter text-red-400">
                    CASE REJECTED BY DISTRICT ATTORNEY
                  </h3>
                  <p className="text-sm text-red-200 max-w-xl mx-auto">
                    The evidence presented on your board contained logical gaps or insufficient proof.
                  </p>
                </div>
              )}

              {/* Master Mystery Solution Graph Visualizer */}
              <div className="mt-6 bg-black/70 p-4 rounded border border-amber-900/50 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 uppercase tracking-wider border-b border-amber-900/40 pb-2">
                  <span className="flex items-center gap-1.5 font-bold">
                    <GitBranch size={14} /> True Mystery Solution Graph Tree
                  </span>
                  <span className="text-[10px] text-amber-600">VALIDATED BY BACKEND ENGINE</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="bg-amber-950/60 p-2.5 rounded border border-amber-800/40">
                    <span className="text-[9px] text-amber-500 uppercase block mb-1">VICTIM</span>
                    <strong className="text-amber-100">{mystery.victim.name}</strong>
                  </div>

                  <div className="bg-red-950/60 p-2.5 rounded border border-red-500/60">
                    <span className="text-[9px] text-red-400 uppercase block mb-1">KILLER</span>
                    <strong className="text-red-200">{solution.killerName}</strong>
                  </div>

                  <div className="bg-amber-950/60 p-2.5 rounded border border-amber-800/40">
                    <span className="text-[9px] text-amber-500 uppercase block mb-1">KEY MOTIVE</span>
                    <strong className="text-amber-200 line-clamp-1">{motiveItem?.title || 'Secret Ledger'}</strong>
                  </div>

                  <div className="bg-amber-950/60 p-2.5 rounded border border-amber-800/40">
                    <span className="text-[9px] text-amber-500 uppercase block mb-1">WEAPON / ALIBI</span>
                    <strong className="text-amber-200 line-clamp-1">{weaponItem?.title || 'Murder Specimen'}</strong>
                  </div>
                </div>
              </div>

              {/* Feedback Breakdown List */}
              <div className="mt-4 text-left bg-black/60 p-4 rounded border border-amber-900/40 space-y-2 font-mono text-xs">
                <div className="text-amber-400 font-bold uppercase tracking-wider mb-2">
                  EVIDENCE EVALUATION BREAKDOWN:
                </div>
                {result.feedback.map((item, idx) => (
                  <div key={idx} className={item.startsWith('✓') ? 'text-green-400' : 'text-red-400'}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-typewriter font-bold py-3 px-8 rounded border border-amber-500/40 transition flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw size={16} /> RETURN TO CORKBOARD
            </button>
          </div>
        ) : (
          /* SUBMISSION FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-black/40 p-4 rounded border border-amber-900/30">
              <label className="block text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">
                1. Identify the Prime Suspect
              </label>
              <div className="grid grid-cols-2 gap-2">
                {mystery.suspects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSuspectId(s.id)}
                    className={`p-3 rounded text-left border font-typewriter text-xs transition ${
                      selectedSuspectId === s.id
                        ? 'bg-red-950/60 border-red-400 text-amber-100 ring-2 ring-red-500/30'
                        : 'bg-black/30 border-amber-900/30 text-amber-300/60 hover:border-amber-700/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-amber-200">{s.name}</div>
                    <div className="text-[10px] text-amber-400/70 font-sans">{s.role}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded border border-amber-900/30 space-y-4">
              <label className="block text-xs font-mono text-amber-400 uppercase tracking-wider">
                2. Designate Key Proof Chain (Board Evidence Linkage)
              </label>

              <div>
                <label className="block text-[11px] font-mono text-amber-300/80 mb-1">
                  MOTIVE EVIDENCE (Key Document/Testimony):
                </label>
                <select
                  value={motiveEvId}
                  onChange={(e) => setMotiveEvId(e.target.value)}
                  className="w-full bg-black/70 border border-amber-800 rounded px-3 py-2 text-xs font-courier text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {evidenceList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.tag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-amber-300/80 mb-1">
                  MURDER WEAPON EVIDENCE (Forensic Specimen/Analysis):
                </label>
                <select
                  value={weaponEvId}
                  onChange={(e) => setWeaponEvId(e.target.value)}
                  className="w-full bg-black/70 border border-amber-800 rounded px-3 py-2 text-xs font-courier text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {evidenceList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.tag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-amber-300/80 mb-1">
                  DISPROVEN ALIBI EVIDENCE (CCTV/Telecom/Timeline):
                </label>
                <select
                  value={alibiEvId}
                  onChange={(e) => setAlibiEvId(e.target.value)}
                  className="w-full bg-black/70 border border-amber-800 rounded px-3 py-2 text-xs font-courier text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {evidenceList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submittedLocal}
                className={`w-full font-typewriter font-bold py-3.5 px-4 rounded shadow-xl border text-sm flex items-center justify-center gap-2 transition ${
                  submittedLocal
                    ? 'bg-amber-950 border-amber-800 text-amber-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 border-red-500 text-amber-100 glow-red'
                }`}
              >
                <UserCheck size={18} />
                {submittedLocal ? 'ACCUSATION LOCKED IN (WAITING FOR PARTNER)' : 'AGREE & SUBMIT CASE FOR VALIDATION'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
