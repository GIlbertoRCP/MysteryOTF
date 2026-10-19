import React, { useEffect, useRef, useState } from 'react';
import { X, Radio, Check, MapPin, MessageCircleQuestion, FileWarning, HeartPulse, Sparkles } from 'lucide-react';
import { alibiStatuses, stressFor, type AlibiStatus } from '../alibi';
import { ConfrontEntry, Evidence, Mystery } from '../types';
import { useI18n } from '../i18n';
import { TypewriterText } from './TypewriterText';
import { KindIcon } from './KindIcon';
import { Portrait, moodFor } from './Portrait';

interface Props {
  mystery: Mystery;
  hasPartner: boolean;
  /** Clues on the shared board: the only ones that can be presented */
  pinnedEvidence: Evidence[];
  confrontations: ConfrontEntry[];
  active: boolean;
  onShareQuote: (suspectId: string, index: number) => void;
  onConfront: (suspectId: string, evidenceId: string) => void;
  onAsk?: () => void;
  onClose: () => void;
}

type Asked = Record<string, number[]>;

function useAsked(caseId: string) {
  const key = `dbs-asked-${caseId}`;
  const [asked, setAsked] = useState<Asked>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  });
  const ask = (suspectId: string, idx: number) =>
    setAsked(prev => {
      const list = prev[suspectId] || [];
      if (list.includes(idx)) return prev;
      const next = { ...prev, [suspectId]: [...list, idx] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { asked, ask };
}

/** A rubber stamp over a suspect's alibi once the evidence settles it. */
export const AlibiStamp: React.FC<{ status: AlibiStatus; small?: boolean }> = ({ status, small }) => {
  const { t } = useI18n();
  if (!status) return null;
  const color = status === 'confirmed' ? 'var(--ok)' : status === 'broken' ? 'var(--blood-bright)' : 'var(--brass)';
  return (
    <span className={`stamp shrink-0 ${small ? 'text-[10px]' : 'text-[11px]'}`} style={{ color }}>
      {t(`alibi.${status}`)}
    </span>
  );
};

const StressMeter: React.FC<{ value: number }> = ({ value }) => {
  const { t } = useI18n();
  const bpm = Math.round(64 + value * 0.9);
  const hot = value >= 70;
  return (
    <div className="w-28 shrink-0" title={`${bpm} bpm`}>
      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-faint)]">
        <span>{t('int.stress')}</span>
        <span className="flex items-center gap-1 tabular" style={{ color: hot ? 'var(--blood-bright)' : undefined }}>
          <HeartPulse size={13} className="heartbeat" style={{ animationDuration: `${60 / bpm}s` }} />
          {bpm}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${value}%`, background: hot ? 'var(--blood-bright)' : value >= 40 ? 'var(--brass)' : 'var(--ok)' }}
        />
      </div>
    </div>
  );
};

function useFollowUps(caseId: string) {
  const key = `dbs-followups-${caseId}`;
  const [open, setOpen] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  });
  const reveal = (id: string) =>
    setOpen(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { open, reveal };
}

export const InterrogationModal: React.FC<Props> = ({
  mystery, hasPartner, pinnedEvidence, confrontations, active, onShareQuote, onConfront, onAsk, onClose,
}) => {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState(mystery.suspects[0]?.id);
  const [mode, setMode] = useState<'ask' | 'present'>('ask');
  const [latest, setLatest] = useState<string | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const { asked, ask } = useAsked(mystery.caseId);
  const { open: followed, reveal } = useFollowUps(mystery.caseId);
  const [shake, setShake] = useState(0);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);
  const seenCount = useRef(confrontations.length);

  const suspect = mystery.suspects.find(s => s.id === activeId) || mystery.suspects[0];
  const askedHere = asked[suspect.id] || [];
  const confrontedHere = confrontations.filter(c => c.suspectId === suspect.id);
  const presented = new Set(confrontedHere.map(c => c.evidenceId));
  const evidenceById = new Map(mystery.evidence.map(e => [e.id, e]));
  const alibis = alibiStatuses(pinnedEvidence, confrontations);

  // Type out reactions that arrive while the room is open.
  useEffect(() => {
    if (confrontations.length > seenCount.current) {
      const c = confrontations[confrontations.length - 1];
      setLatest(`c-${c.suspectId}-${c.evidenceId}`);
      setPending(null);
      if (c.cracked) setShake(n => n + 1);
    }
    seenCount.current = confrontations.length;
  }, [confrontations]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [askedHere.length, confrontedHere.length, activeId, followed.length]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet w-full max-w-5xl h-[min(88vh,800px)] flex flex-col rounded-xl panel shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h2 className="font-typewriter text-[22px] text-[var(--paper)]">{t('int.title')}</h2>
          <button onClick={onClose} className="icon-btn" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0 flex-col sm:flex-row">
          {/* Who's in the chair */}
          <nav className="sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--line)] overflow-x-auto sm:overflow-y-auto p-2 flex sm:flex-col gap-1" aria-label={t('int.pick')}>
            {mystery.suspects.map(s => {
              const isActive = s.id === suspect.id;
              const count = (asked[s.id] || []).length;
              const cracked = confrontations.some(c => c.suspectId === s.id && c.cracked);
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left shrink-0 transition-colors ${isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}
                >
                  <Portrait suspect={s} mood={moodFor(s.id, confrontations)} size={38} rounded />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[var(--text)] truncate max-w-[150px]">{s.name}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-faint)] tabular">
                      {count}/{s.interview.length}
                      {cracked && <span className="rounded bg-blood/20 px-1 text-[10.5px] font-bold text-[var(--blood-bright)]">{t('int.cracked')}</span>}
                      <AlibiStamp status={alibis[s.id] ?? null} small />
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* The conversation */}
          <section className="flex-1 flex flex-col min-h-0">
            <header className="flex items-center gap-4 px-6 py-4 border-b border-[var(--line)]">
              <div key={shake} className={shake ? 'crack-hit' : ''}>
                <Portrait suspect={suspect} mood={moodFor(suspect.id, confrontations)} size={64} rounded />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-typewriter text-[21px] text-[var(--paper)] leading-tight">{suspect.name}</h3>
                <p className="text-[13px] text-[var(--text-dim)]">{suspect.bio}</p>
                <p className="mt-1 flex flex-wrap items-start gap-1.5 text-[12.5px] text-[var(--text-faint)]">
                  <MapPin size={13} className="shrink-0 mt-0.5" />
                  <span className={alibis[suspect.id] === 'broken' ? 'line-through decoration-[var(--blood-bright)] decoration-2' : ''}>{suspect.alibiStatement}</span>
                  <AlibiStamp status={alibis[suspect.id] ?? null} />
                </p>
              </div>
              <StressMeter value={stressFor(suspect.id, confrontations)} />
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {askedHere.map(idx => {
                const qa = suspect.interview[idx];
                const shareKey = `${suspect.id}-${idx}`;
                return (
                  <div key={idx} className="space-y-2">
                    <p className="text-[14px] font-semibold text-[var(--brass)]">{qa.q}</p>
                    <div className="group flex gap-3">
                      <blockquote className="flex-1 font-typed text-[16px] leading-[1.6] text-[var(--paper)] max-w-[62ch]">
                        {latest === shareKey ? <TypewriterText text={`“${qa.a}”`} /> : `“${qa.a}”`}
                      </blockquote>
                      {hasPartner && (
                        <button
                          onClick={() => {
                            onShareQuote(suspect.id, idx);
                            setShared(prev => new Set(prev).add(shareKey));
                          }}
                          disabled={shared.has(shareKey)}
                          className="self-start flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100 transition-opacity"
                          title={t('int.share')}
                        >
                          {shared.has(shareKey) ? <Check size={13} className="text-[var(--ok)]" /> : <Radio size={13} />}
                          {shared.has(shareKey) ? t('int.shared') : t('int.share')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {confrontedHere.map(c => {
                const ev = evidenceById.get(c.evidenceId);
                const key = `c-${c.suspectId}-${c.evidenceId}`;
                return (
                  <div key={key} className={`rounded-lg border px-4 py-3 ${c.cracked ? 'border-blood/60 bg-blood/10' : 'border-[var(--line)]'}`}>
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[var(--text-dim)]">
                      <FileWarning size={14} className="text-[var(--brass)]" />
                      {t('int.presented', { name: c.by, title: ev?.title ?? '?' })}
                      {c.cracked ? (
                        <span className="stamp text-[11px] text-[var(--blood-bright)] ml-1">{t('int.cracked')}</span>
                      ) : (
                        <span className="ml-1 text-[12px] font-normal text-[var(--text-faint)]">{t('int.wasted')}</span>
                      )}
                    </p>
                    <blockquote className={`mt-2 font-typed text-[16px] leading-[1.6] max-w-[62ch] ${c.cracked ? 'text-[var(--paper)]' : 'text-[var(--text-dim)]'}`}>
                      {latest === key ? <TypewriterText text={`“${c.line}”`} /> : `“${c.line}”`}
                    </blockquote>
                    {c.followUp && !followed.includes(key) && (
                      <button
                        onClick={() => {
                          reveal(key);
                          setLatest(`f-${key}`);
                          onAsk?.();
                        }}
                        className="mt-3 flex items-center gap-2 rounded-md border border-[var(--brass-dim)] px-3 py-1.5 text-left text-[13px] font-semibold text-[var(--brass)] hover:bg-white/[0.04]"
                      >
                        <Sparkles size={14} className="shrink-0" />
                        <span>
                          <span className="block text-[11px] uppercase tracking-wide opacity-80">{t('int.newQuestion')}</span>
                          {c.followUp.q}
                        </span>
                      </button>
                    )}
                    {c.followUp && followed.includes(key) && (
                      <div className="mt-3 border-t border-[var(--line)] pt-2">
                        <p className="text-[13.5px] font-semibold text-[var(--brass)]">{c.followUp.q}</p>
                        <blockquote className="mt-1 font-typed text-[15.5px] leading-[1.6] text-[var(--paper)] max-w-[62ch]">
                          {latest === `f-${key}` ? <TypewriterText text={`“${c.followUp.a}”`} /> : `“${c.followUp.a}”`}
                        </blockquote>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={transcriptEnd} />
            </div>

            <footer className="border-t border-[var(--line)]">
              <div className="flex gap-1 px-3 pt-2" role="tablist">
                {(['ask', 'present'] as const).map(m => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                      mode === m ? 'bg-white/[0.08] text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
                    }`}
                  >
                    {m === 'ask' ? <MessageCircleQuestion size={14} /> : <FileWarning size={14} />}
                    {t(m === 'ask' ? 'int.askTab' : 'int.presentTab')}
                  </button>
                ))}
              </div>

              {mode === 'ask' ? (
                <div className="p-3 flex flex-col gap-1.5">
                  {suspect.interview.map((qa, idx) => {
                    const done = askedHere.includes(idx);
                    return (
                      <button
                        key={idx}
                        disabled={done}
                        onClick={() => {
                          ask(suspect.id, idx);
                          setLatest(`${suspect.id}-${idx}`);
                          onAsk?.();
                        }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors ${
                          done ? 'text-[var(--text-faint)] cursor-default' : 'text-[var(--text)] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className={`text-[11.5px] font-bold w-[72px] shrink-0 ${done ? '' : 'text-[var(--brass)]'}`}>
                          {done ? t('int.asked') : t('int.ask')}
                        </span>
                        <span className={done ? 'line-through decoration-[var(--line-strong)]' : ''}>{qa.q}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3">
                  <p className="px-1 pb-2 text-[12.5px] text-[var(--text-faint)]">{t('int.presentHint')}</p>
                  {pinnedEvidence.length === 0 ? (
                    <p className="px-1 py-3 text-[13.5px] text-[var(--text-dim)]">{t('int.presentEmpty')}</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto grid sm:grid-cols-2 gap-1.5">
                      {pinnedEvidence.map(e => {
                        const done = presented.has(e.id);
                        return (
                          <button
                            key={e.id}
                            disabled={done || !active || pending !== null}
                            onClick={() => {
                              setPending(e.id);
                              onConfront(suspect.id, e.id);
                            }}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] transition-colors ${
                              done ? 'border-transparent text-[var(--text-faint)] line-through' : 'border-[var(--line)] text-[var(--text)] hover:border-[var(--brass-dim)] hover:bg-white/[0.03]'
                            }`}
                          >
                            <KindIcon kind={e.kind} size={14} className="shrink-0 text-[var(--brass)]" />
                            <span className="truncate">{e.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
};
