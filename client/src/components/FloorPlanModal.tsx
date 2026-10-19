import React, { Suspense, lazy, useMemo, useState } from 'react';
import { X, Loader2, Search, Check } from 'lucide-react';
import { Mystery, PlanRoom, SearchEntry } from '../types';
import { useI18n } from '../i18n';
import { initials } from '../cardInfo';

const FloorPlan3D = lazy(() => import('./FloorPlan3D'));

interface Props {
  mystery: Mystery;
  /** Evidence this player is allowed to see placed on the plan (their own files plus anything pinned) */
  visibleEvidenceIds: Set<string>;
  searches: SearchEntry[];
  active: boolean;
  onSearch: (spotId: string) => void;
  onClose: () => void;
}

export interface PlanMarkers {
  claims: Record<string, { id: string; name: string; color: string }[]>;
  items: Record<string, string[]>;
  /** Rooms the investigators have been into (the crime scene always counts) */
  lit: Set<string>;
  searched: Map<string, SearchEntry>;
}

export function usePlanMarkers(mystery: Mystery, visible: Set<string>, searches: SearchEntry[]): PlanMarkers {
  return useMemo(() => {
    const claims: PlanMarkers['claims'] = {};
    for (const s of mystery.suspects) (claims[s.alibiRoomId] ??= []).push({ id: s.id, name: s.name, color: s.color });
    const found = new Set(searches.flatMap(s => s.found));
    const items: PlanMarkers['items'] = {};
    for (const e of mystery.evidence) {
      if (e.kind !== 'weapon' || !e.event?.roomId || !visible.has(e.id) || !found.has(e.id)) continue;
      (items[e.event.roomId] ??= []).push(e.title.split(': ').slice(-1)[0]);
    }
    const searched = new Map(searches.map(s => [s.spotId, s]));
    const lit = new Set<string>(mystery.plan.rooms.filter(r => r.kind === 'scene').map(r => r.id));
    for (const r of mystery.plan.rooms) if (r.spots.some(sp => searched.has(sp.id))) lit.add(r.id);
    return { claims, items, lit, searched };
  }, [mystery, visible, searches]);
}

/** Where a search spot sits inside its room, in plan units. */
export function spotPos(room: PlanRoom, k: number) {
  return { x: room.x + room.w * (k === 0 ? 0.3 : 0.72), y: room.y + room.h * 0.42 };
}

const PAD = 1;

export const FloorPlanModal: React.FC<Props> = ({ mystery, visibleEvidenceIds, searches, active, onSearch, onClose }) => {
  const { t } = useI18n();
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [activeId, setActiveId] = useState<string>(mystery.plan.rooms.find(r => r.kind === 'scene')!.id);
  const [pending, setPending] = useState<string | null>(null);
  const markers = usePlanMarkers(mystery, visibleEvidenceIds, searches);
  const { plan } = mystery;
  const room = plan.rooms.find(r => r.id === activeId)!;

  const search = (spotId: string, roomId: string) => {
    setActiveId(roomId);
    if (!active || markers.searched.has(spotId) || pending) return;
    setPending(spotId);
    // A short beat of searching before the result lands.
    setTimeout(() => {
      onSearch(spotId);
      setPending(null);
    }, 650);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl panel shadow-2xl overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="plan-title">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line)] px-5 py-3">
          <h2 id="plan-title" className="font-typewriter text-[22px] text-[var(--paper)]">{t('plan.title')}</h2>
          <div className="flex rounded-md border border-[var(--line)] overflow-hidden text-[13px] font-semibold" role="radiogroup">
            {(['2d', '3d'] as const).map(v => (
              <button
                key={v}
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 transition-colors ${view === v ? 'bg-[var(--brass)] text-[#24170a]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
              >
                {t(v === '2d' ? 'plan.blueprint' : 'plan.3d')}
              </button>
            ))}
          </div>
          <p className="hidden md:block text-[12.5px] text-[var(--text-faint)] flex-1 min-w-[200px]">{t('plan.searchHint')}</p>
          <button onClick={onClose} className="icon-btn ml-auto" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="relative h-[min(56vh,540px)] min-h-[260px] bg-[#0c2547]">
          {view === '2d' ? (
            <Blueprint mystery={mystery} markers={markers} activeId={activeId} pending={pending} onSelect={setActiveId} onSearch={search} />
          ) : (
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center text-[#cfe3ff]">
                  <Loader2 className="animate-spin" />
                </div>
              }
            >
              <FloorPlan3D mystery={mystery} markers={markers} activeId={activeId} pending={pending} onSelect={setActiveId} onSearch={search} />
            </Suspense>
          )}
        </div>

        <RoomDetails room={room} markers={markers} pending={pending} active={active} onSearch={(id) => search(id, room.id)} />
      </div>
    </div>
  );
};

const RoomDetails: React.FC<{ room: PlanRoom; markers: PlanMarkers; pending: string | null; active: boolean; onSearch: (spotId: string) => void }> = ({
  room, markers, pending, active, onSearch,
}) => {
  const { t } = useI18n();
  const claims = markers.claims[room.id] ?? [];
  const items = markers.items[room.id] ?? [];
  return (
    <div className="border-t border-[var(--line)] px-5 py-3.5 grid gap-x-8 gap-y-3 text-[14px] md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      <div className="space-y-2">
        <div>
          <div className="font-typewriter text-[17px] text-[var(--paper)]">{room.label}</div>
          <div className="text-[13px] text-[var(--text-dim)]">
            {room.kind === 'scene' ? t('plan.sceneNote') : t('plan.walk', { n: room.walk })}
          </div>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[var(--text-faint)]">{t('plan.claims')}</div>
          <div className="text-[var(--text)]">{claims.length ? claims.map(c => c.name).join(', ') : '—'}</div>
        </div>
        {items.length > 0 && (
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-faint)]">{t('plan.found')}</div>
            <div className="text-[var(--text)]">{items.join(', ')}</div>
          </div>
        )}
      </div>
      <div>
        <div className="text-[12px] font-semibold text-[var(--text-faint)] mb-1.5">{t('plan.spots')}</div>
        <ul className="space-y-1.5">
          {room.spots.map(sp => {
            const done = markers.searched.get(sp.id);
            return (
              <li key={sp.id} className="flex items-start gap-3">
                {done ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ok)] min-w-[104px] shrink-0 whitespace-nowrap">
                    <Check size={14} /> {sp.label}
                  </span>
                ) : (
                  <button
                    disabled={!active || !!pending}
                    onClick={() => onSearch(sp.id)}
                    className="btn btn-brass py-1 px-2.5 text-[12.5px] min-w-[104px] shrink-0 justify-start whitespace-nowrap"
                  >
                    {pending === sp.id ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} {sp.label}
                  </button>
                )}
                <span className={`text-[13.5px] leading-snug ${done ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'}`}>
                  {done ? done.text : pending === sp.id ? t('plan.searching') : t('plan.dark')}
                  {done && <span className="ml-1.5 text-[12px] text-[var(--text-faint)]">— {done.by}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const Blueprint: React.FC<{
  mystery: Mystery;
  markers: PlanMarkers;
  activeId: string;
  pending: string | null;
  onSelect: (id: string) => void;
  onSearch: (spotId: string, roomId: string) => void;
}> = ({ mystery, markers, activeId, pending, onSelect, onSearch }) => {
  const { t } = useI18n();
  const { plan } = mystery;
  const W = plan.width + PAD * 2;
  const H = plan.height + PAD * 2 + 1;
  const line = '#cfe3ff';

  return (
    <svg viewBox={`${-PAD} ${-PAD} ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={t('plan.title')}>
      <defs>
        <pattern id="bp-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#2c5a92" strokeWidth="0.03" />
        </pattern>
        <radialGradient id="bp-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-PAD} y={-PAD} width={W} height={H} fill="url(#bp-grid)" />

      {plan.corridor && (
        <g>
          <rect {...plan.corridor} fill="#14365f" />
          <text x={plan.corridor.x + plan.corridor.w - 0.3} y={plan.corridor.y + plan.corridor.h / 2 + 0.15} textAnchor="end" fontSize="0.42" fill="#8fb4e6" fontFamily="Courier Prime" letterSpacing="0.08">
            {t('plan.corridor').toUpperCase()}
          </text>
        </g>
      )}

      {plan.rooms.map(r => {
        const isScene = r.kind === 'scene';
        const isActive = r.id === activeId;
        const lit = markers.lit.has(r.id);
        const claims = markers.claims[r.id] ?? [];
        const items = markers.items[r.id] ?? [];
        return (
          <g key={r.id} onClick={() => onSelect(r.id)} onMouseEnter={() => onSelect(r.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={isScene ? 'rgba(216,67,47,0.28)' : lit ? (isActive ? 'rgba(207,227,255,0.16)' : 'rgba(207,227,255,0.07)') : 'rgba(3,10,22,0.78)'}
              stroke={isActive ? '#ffd27a' : line}
              strokeWidth={isActive ? 0.09 : 0.06}
              strokeDasharray={lit ? undefined : '0.25 0.18'}
              style={{ transition: 'fill 0.6s' }}
            />
            {plan.layout === 'corridor' ? (
              <line x1={r.door.x - 0.5} y1={r.door.y} x2={r.door.x + 0.5} y2={r.door.y} stroke="#0c2547" strokeWidth="0.14" />
            ) : null}

            <text x={r.x + 0.3} y={r.y + 0.7} fontSize={Math.min(0.46, (r.w - 0.5) / Math.max(6, r.label.length * 0.55))} fill={line} opacity={lit ? 1 : 0.6} fontFamily="Special Elite">
              {r.label}
            </text>

            {isScene ? (
              <g transform={`translate(${r.x + r.w / 2} ${r.y + r.h / 2 + 0.6})`}>
                <path d="M -0.45 -0.45 L 0.45 0.45 M 0.45 -0.45 L -0.45 0.45" stroke="#ff7a66" strokeWidth="0.14" strokeLinecap="round" />
              </g>
            ) : (
              <g transform={`translate(${r.x + r.w - 0.3} ${r.y + r.h - 0.55})`}>
                <g transform={`translate(${-(t('plan.min', { n: r.walk }).length * 0.23 + 0.35)} 0)`}>
                  <circle cy="-0.13" r="0.2" fill="none" stroke="#8fb4e6" strokeWidth="0.05" />
                  <path d="M 0 -0.25 L 0 -0.13 L 0.09 -0.08" stroke="#8fb4e6" strokeWidth="0.05" fill="none" />
                </g>
                <text textAnchor="end" fontSize="0.38" fill="#8fb4e6" fontFamily="Courier Prime">
                  {t('plan.min', { n: r.walk })}
                </text>
              </g>
            )}

            {/* Search spots: glowing until searched */}
            {r.spots.map((sp, k) => {
              const p = spotPos(r, k);
              const done = markers.searched.has(sp.id);
              return (
                <g
                  key={sp.id}
                  transform={`translate(${p.x} ${p.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearch(sp.id, r.id);
                  }}
                  style={{ cursor: done ? 'default' : 'pointer' }}
                >
                  <title>{sp.label}</title>
                  {!done && <circle r="0.7" fill="url(#bp-glow)" className={pending === sp.id ? '' : 'plan-spot-pulse'} />}
                  <circle r="0.24" fill={done ? '#2e7d4f' : '#ffd27a'} stroke="#0c2547" strokeWidth="0.05" />
                  {done ? (
                    <path d="M -0.11 0 L -0.03 0.09 L 0.12 -0.08" stroke="#fff" strokeWidth="0.06" fill="none" />
                  ) : (
                    <circle r="0.08" fill="#0c2547" />
                  )}
                </g>
              );
            })}

            {claims.map((c, i) => (
              <g key={c.id} transform={`translate(${r.x + 0.65 + i * 0.85} ${r.y + r.h - 0.7})`}>
                <title>{c.name}</title>
                <circle r="0.36" fill="#0c2547" stroke={c.color} strokeWidth="0.07" />
                <text y="0.13" textAnchor="middle" fontSize="0.32" fill={c.color} fontFamily="Special Elite">
                  {initials(c.name)}
                </text>
              </g>
            ))}

            {items.map((label, i) => (
              <g key={label} transform={`translate(${r.x + 0.4} ${r.y + 1.3 + i * 0.6})`}>
                <rect x="-0.14" y="-0.14" width="0.28" height="0.28" fill="#ffd27a" transform="rotate(45)" />
                <text x="0.35" y="0.13" fontSize="0.34" fill="#ffd27a" fontFamily="Courier Prime">
                  <title>{label}</title>
                  {label.length > Math.floor((r.w - 0.9) / 0.21) ? `${label.slice(0, Math.floor((r.w - 0.9) / 0.21) - 1)}…` : label}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {plan.layout === 'linear' && (
        <text x={plan.width / 2} y={plan.height + 0.9} textAnchor="middle" fontSize="0.38" fill="#8fb4e6" fontFamily="Courier Prime">
          {t('plan.trainNote')}
        </text>
      )}
    </svg>
  );
};
