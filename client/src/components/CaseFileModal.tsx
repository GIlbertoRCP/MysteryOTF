import React, { useState } from 'react';
import { X, Copy, Check, CloudLightning } from 'lucide-react';
import { ConfrontEntry, Evidence, Mystery, TraitDim } from '../types';
import { alibiStatuses } from '../alibi';
import { AlibiStamp } from './InterrogationModal';
import { useI18n, TKey } from '../i18n';
import { Portrait } from './Portrait';

interface Props {
  mystery: Mystery;
  pinnedEvidence?: Evidence[];
  confrontations?: ConfrontEntry[];
  onClose: () => void;
}

const DIMS: TraitDim[] = ['height', 'coat', 'voice', 'hand', 'footwear', 'habit', 'blood'];

function useStruck(caseId: string) {
  const key = `dbs-struck-${caseId}`;
  const [struck, setStruck] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) =>
    setStruck(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { struck, toggle };
}

export const CaseFileModal: React.FC<Props> = ({ mystery, pinnedEvidence = [], confrontations = [], onClose }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState<'briefing' | 'suspects' | 'rules'>('briefing');
  const [copied, setCopied] = useState(false);
  const { struck, toggle } = useStruck(mystery.caseId);
  const alibis = alibiStatuses(pinnedEvidence, confrontations);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet w-full max-w-5xl max-h-[86vh] flex flex-col rounded-xl panel shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="flex items-center gap-4 border-b border-[var(--line)] px-5 pt-4">
          <h2 className="font-typewriter text-[22px] text-[var(--paper)] pb-3">{t('file.title')}</h2>
          <div className="flex gap-1 self-end" role="tablist">
            {(['briefing', 'suspects', 'rules'] as const).map(key => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`relative px-3 pb-3 text-[14px] font-semibold transition-colors ${tab === key ? 'text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'}`}
              >
                {t(`file.${key}` as TKey)}
                {tab === key && <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded bg-[var(--brass)]" />}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="icon-btn ml-auto mb-2" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'briefing' && (
            <div className="grid md:grid-cols-[1fr_260px] gap-6 p-5 sm:p-7">
              <article className="paper rounded-md p-6 sm:p-8">
                <h3 className="font-typewriter text-[28px] leading-tight text-[var(--ink)] [text-wrap:balance]">{mystery.title}</h3>
                <p className="mt-4 font-typed text-[16.5px] leading-[1.7] text-[#2f2216] max-w-[64ch]">{mystery.synopsis}</p>
                {mystery.modifier && (
                  <div className="mt-5 flex gap-3 rounded border-2 border-dashed border-[#7a1f2b]/60 px-4 py-3 text-[#3a1a12]">
                    <CloudLightning size={20} className="mt-0.5 shrink-0 text-[#7a1f2b]" />
                    <p className="text-[14.5px] leading-snug">
                      <span className="block font-typewriter text-[13px] uppercase tracking-widest text-[#7a1f2b]">
                        {t('mod.title')}: {mystery.modifier.label}
                      </span>
                      {mystery.modifier.note}
                    </p>
                  </div>
                )}
              </article>
              <dl className="space-y-4 text-[14px]">
                <Fact label={t('file.victim')}>
                  <span className="font-typewriter text-[18px] text-[var(--paper)]">{mystery.victim.name}</span>
                  <span className="block text-[var(--text-dim)]">
                    {mystery.victim.occupation}, {t('file.age', { n: mystery.victim.age }).toLowerCase()}
                  </span>
                </Fact>
                <Fact label={t('file.scene')}>{mystery.victim.scene}</Fact>
                <Fact label={t('file.time')}>{mystery.victim.timeWindow}</Fact>
                <Fact label={t('file.seed')}>
                  <button
                    className="inline-flex items-center gap-2 tabular tracking-wider text-[var(--text-dim)] hover:text-[var(--text)]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(mystery.seed);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        /* clipboard blocked */
                      }
                    }}
                  >
                    {mystery.seed} {copied ? <Check size={14} className="text-[var(--ok)]" /> : <Copy size={13} />}
                  </button>
                </Fact>
              </dl>
            </div>
          )}

          {tab === 'suspects' && (
            <div className="p-3 sm:p-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-[13.5px]">
                  <thead>
                    <tr className="text-left text-[12px] font-semibold text-[var(--text-faint)]">
                      <th className="sticky left-0 bg-[var(--bg-panel)] px-3 py-2 font-semibold">{t('file.suspects')}</th>
                      <th className="px-3 py-2 font-semibold">{t('file.alibi')}</th>
                      {DIMS.map(d => (
                        <th key={d} className="px-3 py-2 font-semibold">{t(`trait.${d}` as TKey)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mystery.suspects.map(s => {
                      const isStruck = struck.has(s.id);
                      return (
                        <tr key={s.id} className={`group transition-opacity ${isStruck ? 'opacity-45' : ''}`}>
                          <td className="sticky left-0 bg-[var(--bg-panel)] border-t border-[var(--line)] px-3 py-3 align-top">
                            <button onClick={() => toggle(s.id)} className="flex items-start gap-3 text-left" title={t('file.strike')}>
                              <Portrait suspect={s} size={44} rounded />
                              <span>
                                <span className={`block font-semibold text-[var(--text)] ${isStruck ? 'line-through decoration-[var(--blood-bright)] decoration-2' : ''}`}>{s.name}</span>
                                <span className="block text-[12.5px] text-[var(--text-faint)]">
                                  {s.role}, {t('file.age', { n: s.age }).toLowerCase()}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="border-t border-[var(--line)] px-3 py-3 align-top text-[var(--text-dim)] max-w-[220px]">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={`text-[var(--text)] ${alibis[s.id] === 'broken' ? 'line-through decoration-[var(--blood-bright)] decoration-2' : ''}`}>{s.alibiPlace}</span>
                              <AlibiStamp status={alibis[s.id] ?? null} small />
                            </span>
                            <span className="block text-[12.5px] leading-snug">{s.bio}</span>
                          </td>
                          {DIMS.map(d => (
                            <td key={d} className="border-t border-[var(--line)] px-3 py-3 align-top text-[var(--text)]">
                              {s.traits[d]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 px-3 text-[12.5px] text-[var(--text-faint)]">{t('file.strikeHint')}</p>
            </div>
          )}

          {tab === 'rules' && (
            <div className="p-5 sm:p-8 max-w-[70ch]">
              <ul className="space-y-4 text-[15.5px] leading-relaxed text-[var(--text-dim)]">
                {(['file.rule1', 'file.rule2', 'file.rule6', 'file.rule7', 'file.rule3', 'file.rule4', 'file.rule5'] as TKey[]).map(k => (
                  <li key={k} className="flex gap-3">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blood-bright)]" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[13px] text-[var(--text-faint)]">
                <kbd className="rounded border border-[var(--line)] px-1">C</kbd> {t('header.caseFile')} ·{' '}
                <kbd className="rounded border border-[var(--line)] px-1">I</kbd> {t('header.interrogate')} ·{' '}
                <kbd className="rounded border border-[var(--line)] px-1">T</kbd> {t('header.tidy')} ·{' '}
                <kbd className="rounded border border-[var(--line)] px-1">F</kbd> {t('board.fit')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[12px] font-semibold text-[var(--text-faint)]">{label}</dt>
    <dd className="mt-0.5 text-[var(--text)]">{children}</dd>
  </div>
);
