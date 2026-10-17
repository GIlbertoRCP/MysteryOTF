import React, { useEffect, useRef, useState } from 'react';
import { X, Radio, Check, MapPin } from 'lucide-react';
import { Mystery } from '../types';
import { useI18n } from '../i18n';
import { initials } from '../cardInfo';
import { TypewriterText } from './TypewriterText';

interface Props {
  mystery: Mystery;
  hasPartner: boolean;
  onShareQuote: (suspectId: string, index: number) => void;
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

export const InterrogationModal: React.FC<Props> = ({ mystery, hasPartner, onShareQuote, onAsk, onClose }) => {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState(mystery.suspects[0]?.id);
  const [latest, setLatest] = useState<string | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const { asked, ask } = useAsked(mystery.caseId);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);

  const suspect = mystery.suspects.find(s => s.id === activeId) || mystery.suspects[0];
  const askedHere = asked[suspect.id] || [];

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [askedHere.length, activeId]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet w-full max-w-5xl h-[min(86vh,780px)] flex flex-col rounded-xl panel shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
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
              const active = s.id === suspect.id;
              const count = (asked[s.id] || []).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left shrink-0 transition-colors ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-typewriter text-[14px]"
                    style={{ background: `${s.color}26`, color: s.color, border: `1px solid ${s.color}66` }}
                  >
                    {initials(s.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[var(--text)] truncate max-w-[150px]">{s.name}</span>
                    <span className="block text-[12px] text-[var(--text-faint)] tabular">
                      {count}/{s.interview.length}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* The conversation */}
          <section className="flex-1 flex flex-col min-h-0">
            <header className="flex items-center gap-4 px-6 py-4 border-b border-[var(--line)]">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-typewriter text-[20px]"
                style={{ background: `${suspect.color}22`, color: suspect.color, border: `1.5px solid ${suspect.color}88` }}
              >
                {initials(suspect.name)}
              </span>
              <div className="min-w-0">
                <h3 className="font-typewriter text-[21px] text-[var(--paper)] leading-tight">{suspect.name}</h3>
                <p className="text-[13px] text-[var(--text-dim)]">{suspect.bio}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--text-faint)]">
                  <MapPin size={13} className="shrink-0" /> {suspect.alibiStatement}
                </p>
              </div>
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
              <div ref={transcriptEnd} />
            </div>

            <footer className="border-t border-[var(--line)] p-3 flex flex-col gap-1.5">
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
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
};
