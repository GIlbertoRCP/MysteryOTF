import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { AccusationResult, Mystery, Room } from '../types';
import { useI18n, TKey } from '../i18n';
import { Portrait } from './Portrait';
import { formatMin } from '../utils/time';

interface Props {
  mystery: Mystery;
  room: Room;
  result: AccusationResult;
  onClose: () => void;
}

const fmtDuration = (ms: number) => {
  const sec = Math.round(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/**
 * The case written up after it closes: how the team did, who everyone really was,
 * and the full sequence of events. Saves to PDF through the browser's print dialog.
 */
export const DossierModal: React.FC<Props> = ({ mystery, room, result, onClose }) => {
  const { t, lang } = useI18n();
  const sol = result.solution;
  const solved = result.status === 'solved';
  const wrongAccusations = result.attemptsUsed - (solved ? 1 : 0);

  const roleOf = (id: string): TKey =>
    id === sol?.killerId ? 'dossier.role.killer'
    : id === sol?.accompliceId ? 'dossier.role.accomplice'
    : result.framedIds?.includes(id) ? 'dossier.role.framed'
    : 'dossier.role.innocent';

  const stats: [TKey, string][] = [
    ['dossier.time', result.elapsedMs ? fmtDuration(result.elapsedMs) : '—'],
    ['dossier.accusations', `${result.attemptsUsed}/${result.maxAttempts}`],
    ['dossier.hints', String(result.hintsUsed)],
    ['dossier.falseLeads', String((result.wastedConfronts ?? 0) + wrongAccusations)],
    ['dossier.searched', String(result.spotsSearched ?? 0)],
    ['dossier.score', result.score !== undefined ? String(result.score) : '—'],
  ];

  const solution: [TKey, string | undefined][] = sol
    ? [
        ['seq.motive', mystery.options.motives.find(m => m.id === sol.motiveId)?.label],
        ['seq.means', mystery.options.weapons.find(w => w.id === sol.weaponId)?.label],
        ['seq.opportunity', mystery.evidence.find(e => e.id === sol.alibiEvidenceId)?.title],
      ]
    : [];

  return createPortal(
    <div className="overlay dossier-print-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet paper dossier-sheet relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-md px-6 sm:px-10 py-8" role="dialog" aria-modal="true">
        <div className="dossier-actions absolute right-3 top-3 flex gap-1">
          <button onClick={() => window.print()} className="btn btn-ink !py-1.5 text-[13px]">
            <Printer size={14} /> {t('dossier.print')}
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--ink-soft)] hover:bg-black/5" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <header className="border-b-2 border-ink/70 pb-4 pr-36">
          <p className="font-typewriter text-[12px] uppercase tracking-[0.25em] text-[var(--ink-soft)]">{t('dossier.title')} · {mystery.seed}</p>
          <h2 className="mt-1 font-typewriter text-[30px] leading-tight text-[var(--ink)] [text-wrap:balance]">{mystery.title}</h2>
          <p className="mt-1 text-[14px] text-[var(--ink-soft)]">
            {mystery.victim.name} · {mystery.victim.scene} · {mystery.difficulty}
            {room.daily ? ` · ${room.daily}` : ''}
          </p>
          <span className="stamp mt-3 inline-block text-[18px]" style={{ color: solved ? '#2e7d4f' : '#b3261e' }}>
            {t(solved ? 'dossier.outcomeSolved' : 'dossier.outcomeFailed')}
          </span>
        </header>

        <section className="mt-6">
          <h3 className="font-typewriter text-[18px] text-[var(--ink)]">{t('dossier.stats')}</h3>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t(k)}</dt>
                <dd className="font-typewriter text-[24px] leading-tight text-[var(--ink)] tabular">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {sol && (
          <section className="mt-7">
            <h3 className="font-typewriter text-[18px] text-[var(--ink)]">{t('dossier.solution')}</h3>
            <dl className="mt-2 grid sm:grid-cols-3 gap-3">
              {solution.map(([k, v]) => (
                <div key={k} className="rounded border border-ink/20 px-3 py-2">
                  <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t(k)}</dt>
                  <dd className="font-typed text-[15px] text-[var(--ink)]">{v ?? '?'}</dd>
                </div>
              ))}
            </dl>
            {result.explanation && <p className="mt-3 font-typed text-[15px] leading-[1.65] text-[#2f2216]">{result.explanation}</p>}
          </section>
        )}

        <section className="mt-7">
          <h3 className="font-typewriter text-[18px] text-[var(--ink)]">{t('dossier.cast')}</h3>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2.5">
            {mystery.suspects.map(s => {
              const role = roleOf(s.id);
              const guilty = role === 'dossier.role.killer' || role === 'dossier.role.accomplice';
              return (
                <li key={s.id} className="flex items-center gap-3 rounded border border-ink/15 px-3 py-2 break-inside-avoid">
                  <Portrait suspect={s} size={44} rounded />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--ink)]">{s.name}</span>
                    <span className="block text-[12.5px] text-[var(--ink-soft)] truncate">{s.role}</span>
                  </span>
                  <span className="stamp text-[11px]" style={{ color: guilty ? '#b3261e' : role === 'dossier.role.framed' ? '#8a5a12' : '#4a5a4e' }}>
                    {t(role)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {result.story && result.story.length > 0 && (
          <section className="mt-7">
            <h3 className="font-typewriter text-[18px] text-[var(--ink)]">{t('dossier.truth')}</h3>
            <ol className="mt-3 border-l-2 border-ink/30 pl-5 space-y-3">
              {result.story.map((ev, i) => (
                <li key={i} className="relative break-inside-avoid">
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#7a1f2b]" />
                  <span className="font-typewriter text-[13px] text-[var(--ink-soft)] tabular">{formatMin(ev.min, lang)}</span>
                  <p className="font-typed text-[15px] leading-[1.6] text-[#2f2216]">{ev.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>,
    document.body
  );
};
