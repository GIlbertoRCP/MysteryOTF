import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Mystery } from '../types';
import { useI18n, TKey } from '../i18n';
import { formatMin } from '../utils/time';
import { KindIcon } from './KindIcon';

interface Props {
  mystery: Mystery;
  /** Only evidence on the shared board appears, so both players see the same timeline */
  pinnedRefs: Set<string>;
  onInspect: (evidenceId: string) => void;
  onClose: () => void;
}

type Verdict = 'conflict' | 'clears' | null;

export const TimelinePanel: React.FC<Props> = ({ mystery, pinnedRefs, onInspect, onClose }) => {
  const { t, lang } = useI18n();
  const { windowStart, windowEnd } = mystery.victim;
  const from = windowStart - 10;
  const to = windowEnd + 10;
  const pct = (min: number) => ((Math.min(to, Math.max(from, min)) - from) / (to - from)) * 100;

  const events = useMemo(() => {
    const roomWalk = new Map(mystery.plan.rooms.map(r => [r.id, r.walk]));
    const tod = mystery.evidence.find(e => e.kind === 'autopsy' && pinnedRefs.has(e.id))?.event?.min;
    const list = mystery.evidence
      .filter(e => pinnedRefs.has(e.id) && e.event && e.event.min >= 0)
      .map(e => {
        const ev = e.event!;
        const suspect = ev.suspectId ? mystery.suspects.find(s => s.id === ev.suspectId) : undefined;
        let verdict: Verdict = null;
        let note = '';
        if (suspect && ev.roomId && ev.roomId !== suspect.alibiRoomId && ev.min >= windowStart && ev.min <= windowEnd) {
          verdict = 'conflict';
          note = t('tl.conflict', { name: suspect.name });
        } else if (suspect && ev.roomId && tod !== undefined) {
          const walk = roomWalk.get(ev.roomId) ?? 0;
          if (ev.min + walk > tod) {
            verdict = 'clears';
            note = t('tl.clears', { name: suspect.name, n: walk });
          }
        }
        return { e, min: ev.min, verdict, note };
      })
      .sort((a, b) => a.min - b.min);
    // Stagger labels onto rows so they don't sit on top of each other.
    const rows: number[] = [];
    return list.map(item => {
      let row = rows.findIndex(end => pct(item.min) - end > 17);
      if (row === -1) {
        row = rows.length;
        rows.push(0);
      }
      rows[row] = pct(item.min);
      return { ...item, row: Math.min(row, 3) };
    });
  }, [mystery, pinnedRefs, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const shortLabel = (e: Mystery['evidence'][number]) => {
    const suspect = e.event?.suspectId ? mystery.suspects.find(s => s.id === e.event!.suspectId) : undefined;
    if (e.kind === 'autopsy') return t('tl.tod');
    if (e.kind === 'sighting' && suspect) return suspect.name;
    if (e.kind === 'receipt') return `${t('kind.receipt')} · ${e.title.split(': ').slice(-1)[0]}`;
    return t(`kind.${e.kind}` as TKey);
  };

  const ticks = [];
  for (let m = Math.ceil(from / 5) * 5; m <= to; m += 5) ticks.push(m);

  return (
    <section className="sheet absolute left-3 right-3 bottom-[70px] z-20 rounded-xl panel shadow-2xl px-4 pt-3 pb-4" aria-label={t('tl.title')}>
      <div className="flex items-center gap-3">
        <h2 className="font-typewriter text-[16px] text-[var(--paper)]">{t('tl.title')}</h2>
        <span className="text-[12.5px] text-[var(--text-faint)] hidden sm:inline">{t('tl.hint')}</span>
        <button onClick={onClose} className="icon-btn ml-auto h-8 w-8" aria-label={t('common.close')}>
          <X size={16} />
        </button>
      </div>

      <div className="relative mt-3 h-[150px] overflow-x-auto">
        <div className="relative h-full min-w-[560px] mx-8">
          {/* The murder window */}
          <div
            className="absolute top-0 bottom-6 rounded bg-blood/15 border-x border-blood/40"
            style={{ left: `${pct(windowStart)}%`, width: `${pct(windowEnd) - pct(windowStart)}%` }}
          />
          <span className="absolute -top-0.5 text-[11px] font-semibold text-[var(--blood-bright)]" style={{ left: `calc(${pct(windowStart)}% + 6px)` }}>
            {t('tl.window')}
          </span>

          {/* Axis */}
          <div className="absolute left-0 right-0 bottom-6 h-px bg-[var(--line-strong)]" />
          {ticks.map(m => (
            <div key={m} className="absolute bottom-0 -translate-x-1/2 text-center" style={{ left: `${pct(m)}%` }}>
              <div className={`mx-auto w-px ${m % 10 === 0 ? 'h-2.5 bg-[var(--text-faint)]' : 'h-1.5 bg-[var(--line-strong)]'}`} />
              {m % 10 === 0 && <div className="mt-0.5 text-[11px] text-[var(--text-faint)] tabular whitespace-nowrap">{formatMin(m, lang)}</div>}
            </div>
          ))}

          {events.length === 0 && (
            <p className="absolute inset-x-0 top-10 text-center text-[13px] text-[var(--text-faint)]">{t('tl.empty')}</p>
          )}

          {events.map(({ e, min, verdict, note, row }) => {
            const color = verdict === 'conflict' ? 'var(--blood-bright)' : verdict === 'clears' ? 'var(--ok)' : e.kind === 'autopsy' ? 'var(--paper)' : 'var(--brass)';
            return (
              <button
                key={e.id}
                onClick={() => onInspect(e.id)}
                className="group absolute flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pct(min)}%`, top: 12 + row * 26, bottom: 18 }}
                title={note || e.title}
              >
                <span
                  className={`flex max-w-[150px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${verdict === 'conflict' ? 'timeline-glow' : ''}`}
                  style={{ background: 'rgba(0,0,0,0.55)', color, border: `1px solid ${color}` }}
                >
                  <KindIcon kind={e.kind} size={12} />
                  <span className="truncate">{shortLabel(e)}</span>
                </span>
                <span className="w-px flex-1" style={{ background: color, opacity: 0.6 }} />
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {note && (
                  <span className="pointer-events-none absolute top-full mt-5 hidden whitespace-nowrap rounded bg-black/85 px-2 py-1 text-[11.5px] text-[var(--text)] group-hover:block">{note}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {events.some(ev => ev.verdict) && (
        <ul className="mt-2 space-y-0.5 text-[12.5px]">
          {events.filter(ev => ev.verdict).map(ev => (
            <li key={ev.e.id} style={{ color: ev.verdict === 'conflict' ? 'var(--blood-bright)' : 'var(--ok)' }}>
              {formatMin(ev.min, lang)} · {ev.note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
