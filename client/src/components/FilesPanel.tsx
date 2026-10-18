import React, { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Check, Pin, GripVertical, FlaskConical, Loader2 } from 'lucide-react';
import { Difficulty, Evidence, LabState, Mystery, Player, Role } from '../types';
import { useI18n, TKey } from '../i18n';
import { ROLE_COLORS, initials } from '../cardInfo';
import { KindIcon, KIND_ORDER } from './KindIcon';
import { useIsPhone } from '../utils/device';

interface FilesPanelProps {
  mystery: Mystery;
  me: Player;
  pinnedRefs: Set<string>;
  onPin: (evidenceId: string) => void;
  onPinSuspect: (suspectId: string) => void;
  onInspect: (evidenceId: string) => void;
  onOpenSuspects: () => void;
  /** Present only in solo games */
  lab: LabState | null;
  difficulty: Difficulty;
  tutorial: boolean;
  onRequestLab: (evidenceId: string) => void;
}

const LAB_KINDS = ['autopsy', 'weapon', 'smudge', 'shoeprint', 'trace', 'scrapings'];
const LAB_SECONDS: Record<Difficulty, number> = { Novice: 10, Detective: 18, Mastermind: 28 };

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export const DRAG_MIME = 'application/x-dbs-file';

function useSeen(caseId: string) {
  const key = `dbs-seen-${caseId}`;
  const [seen, setSeen] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {
      return new Set();
    }
  });
  const markSeen = (id: string) => {
    setSeen(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };
  return { seen, markSeen };
}

export const FilesPanel: React.FC<FilesPanelProps> = ({
  mystery, me, pinnedRefs, onPin: pinEvidence, onPinSuspect: pinSuspect, onInspect, onOpenSuspects, lab, difficulty, tutorial, onRequestLab,
}) => {
  const { t } = useI18n();
  const solo = !!lab;
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  // On phones the panel is a bottom sheet that gets out of the way after pinning.
  const onPin = (id: string) => {
    pinEvidence(id);
    if (isPhone) setOpen(false);
  };
  const onPinSuspect = (id: string) => {
    pinSuspect(id);
    if (isPhone) setOpen(false);
  };
  const [tab, setTab] = useState<'files' | 'lab' | 'suspects'>('files');
  const { seen, markSeen } = useSeen(mystery.caseId);
  const now = useNow(!!lab?.running);

  const isLocked = (e: Evidence) => !!lab && e.role === 'analyst' && LAB_KINDS.includes(e.kind) && !lab.unlocked.includes(e.id);
  const filesFor = (role: Role) =>
    mystery.evidence.filter(e => e.role === role).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const tabRole: Role = tab === 'lab' ? 'analyst' : me.role;
  const mine = filesFor(tabRole);
  const unseenIn = (role: Role) => filesFor(role).filter(e => !seen.has(e.id) && !isLocked(e)).length;

  // Anything already on the board counts as seen.
  useEffect(() => {
    mystery.evidence.forEach(e => pinnedRefs.has(e.id) && markSeen(e.id));
  }, [pinnedRefs.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const unseenCount = unseenIn(me.role) + (solo ? unseenIn('analyst') : 0);
  const roleColor = ROLE_COLORS[tabRole];
  const tabs = solo ? (['files', 'lab', 'suspects'] as const) : (['files', 'suspects'] as const);
  const tabLabel = (key: 'files' | 'lab' | 'suspects') =>
    key === 'suspects'
      ? t('files.suspects')
      : solo
        ? t(key === 'lab' ? 'files.tab.lab' : 'files.tab.field')
        : t(me.role === 'lead' ? 'files.lead' : 'files.analyst');

  if (!open && isPhone) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-3 left-3 z-20 btn panel shadow-lg text-[var(--text)]"
      >
        <PanelLeftOpen size={16} /> {t('files.open')}
        {unseenCount > 0 && (
          <span className="rounded-full px-1.5 text-[11px] font-bold text-[#1b1209]" style={{ background: roleColor }}>
            {unseenCount}
          </span>
        )}
      </button>
    );
  }

  if (!open) {
    return (
      <aside className="w-12 shrink-0 bg-[var(--bg-raised)] border-r border-[var(--line)] flex flex-col items-center py-3 gap-3 z-20">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label={t('files.expand')} title={t('files.expand')}>
          <PanelLeftOpen size={18} />
        </button>
        {unseenCount > 0 && (
          <span className="rounded-full px-1.5 text-[11px] font-bold text-[#1b1209]" style={{ background: roleColor }}>
            {unseenCount}
          </span>
        )}
      </aside>
    );
  }

  const panel = (
    <aside
      className={
        isPhone
          ? 'sheet w-full max-h-[78vh] rounded-t-2xl bg-[var(--bg-raised)] border-t border-[var(--line-strong)] flex flex-col min-h-0 shadow-2xl'
          : 'w-[300px] shrink-0 bg-[var(--bg-raised)] border-r border-[var(--line)] flex flex-col z-20 min-h-0'
      }
      onClick={(e) => e.stopPropagation()}
    >
      {isPhone && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" aria-hidden />}
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: solo ? 'var(--brass)' : roleColor }} />
        <h2 className="font-typewriter text-[16px] text-[var(--paper)] flex-1">{solo ? t('files.title') : t(`role.${me.role}` as TKey)}</h2>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('files.collapse')} title={t('files.collapse')}>
          <PanelLeftClose size={17} />
        </button>
      </div>

      <div className="flex gap-1 px-3 pt-2 border-b border-[var(--line)]" role="tablist">
        {tabs.map(key => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative whitespace-nowrap px-2.5 pb-2 pt-1 text-[13.5px] font-semibold transition-colors ${
              tab === key ? 'text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
            }`}
          >
            {tabLabel(key)}
            {key !== 'suspects' && unseenIn(key === 'lab' ? 'analyst' : me.role) > 0 && (
              <span className="ml-1.5 rounded-full px-1.5 text-[10.5px] font-bold text-[#1b1209]" style={{ background: ROLE_COLORS[key === 'lab' ? 'analyst' : me.role] }}>
                {unseenIn(key === 'lab' ? 'analyst' : me.role)}
              </span>
            )}
            {lab?.running && key === 'lab' && <Loader2 size={12} className="ml-1 inline animate-spin text-[var(--analyst)]" />}
            {tab === key && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded" style={{ background: key === 'suspects' ? 'var(--brass)' : ROLE_COLORS[key === 'lab' ? 'analyst' : me.role] }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tab !== 'suspects' ? (
          <>
            <p className="px-2 pb-2 text-[12.5px] leading-snug text-[var(--text-faint)]">
              {tab === 'lab'
                ? t('files.lab.hint', { s: tutorial ? 6 : LAB_SECONDS[difficulty] })
                : solo
                  ? `${t('files.solo')} ${t(isPhone ? 'files.pinHint' : 'files.dragHint')}`
                  : `${t('files.onlyYou')} ${t(isPhone ? 'files.pinHint' : 'files.dragHint')}`}
            </p>
            <ul className="space-y-1">
              {mine.map(item => {
                if (isLocked(item)) {
                  const running = lab?.running?.id === item.id;
                  const secs = running ? Math.max(0, Math.ceil((lab!.running!.readyAt - now) / 1000)) : 0;
                  return (
                    <li key={item.id} className="rounded-md border border-dashed border-[var(--line-strong)] px-2.5 py-2.5">
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/5 text-[var(--text-faint)]">
                          <KindIcon kind={item.kind} size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-[var(--text-faint)]">
                            {t(`kind.${item.kind}` as TKey)} · {t('files.lab.locked')}
                          </span>
                          <span className="block text-[13.5px] font-semibold leading-snug text-[var(--text-dim)]">{item.title}</span>
                        </span>
                      </div>
                      <div className="mt-2 pl-[38px]">
                        {running ? (
                          <div className="flex items-center gap-2">
                            <span className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                              <span
                                className="block h-full bg-[var(--analyst)] transition-[width] duration-300"
                                style={{ width: `${100 - (secs / (tutorial ? 6 : LAB_SECONDS[difficulty])) * 100}%` }}
                              />
                            </span>
                            <span className="text-[12px] font-semibold text-[var(--analyst)] tabular shrink-0">{t('files.lab.running', { s: secs })}</span>
                          </div>
                        ) : (
                          <button
                            disabled={!!lab?.running}
                            onClick={() => onRequestLab(item.id)}
                            className="btn px-2.5 py-1.5 text-[12px] bg-analyst/15 text-[var(--analyst)] hover:bg-analyst/25"
                          >
                            <FlaskConical size={13} /> {lab?.running ? t('files.lab.busy') : t('files.lab.request')}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                const pinned = pinnedRefs.has(item.id);
                const isNew = !seen.has(item.id);
                return (
                  <li
                    key={item.id}
                    draggable={!pinned}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'evidence', refId: item.id }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`group relative rounded-md border transition-colors ${
                      pinned ? 'border-transparent opacity-60' : 'border-[var(--line)] hover:border-[var(--line-strong)] bg-white/[0.02] cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <button
                      onClick={() => {
                        markSeen(item.id);
                        onInspect(item.id);
                      }}
                      className="w-full text-left flex gap-2.5 px-2.5 py-2.5 pr-14"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--paper)] text-[var(--ink)]">
                        <KindIcon kind={item.kind} size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-faint)]">
                          {t(`kind.${item.kind}` as TKey)}
                          {isNew && <span className="h-1.5 w-1.5 rounded-full" style={{ background: roleColor }} aria-label={t('files.new')} />}
                        </span>
                        <span className="block text-[13.5px] font-semibold leading-snug text-[var(--text)]">{item.title}</span>
                        <span className="block text-[12.5px] leading-snug text-[var(--text-dim)] line-clamp-2">{item.summary}</span>
                      </span>
                    </button>
                    <div className="absolute right-2 top-2.5">
                      {pinned ? (
                        <span className="flex items-center gap-1 text-[11.5px] text-[var(--ok)]" title={t('files.onBoard')}>
                          <Check size={14} />
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            markSeen(item.id);
                            onPin(item.id);
                          }}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-[var(--text-dim)] hover:text-[#1b1209] hover:bg-[var(--brass)] transition-colors"
                          title={t('files.pin')}
                        >
                          <Pin size={13} /> {t('files.pin')}
                        </button>
                      )}
                    </div>
                    {!pinned && (
                      <GripVertical size={14} className="absolute right-2 bottom-2.5 text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
            {mystery.suspects.map(s => {
              const pinned = pinnedRefs.has(s.id);
              return (
                <li
                  key={s.id}
                  draggable={!pinned}
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'suspect', refId: s.id }))}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-white/[0.03]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-typewriter text-[14px]"
                    style={{ background: `${s.color}26`, color: s.color, border: `1px solid ${s.color}66` }}
                  >
                    {initials(s.name)}
                  </span>
                  <button onClick={onOpenSuspects} className="min-w-0 flex-1 text-left">
                    <span className="block text-[13.5px] font-semibold leading-tight text-[var(--text)] truncate">{s.name}</span>
                    <span className="block text-[12px] text-[var(--text-faint)] truncate">{s.role} · {s.alibiPlace}</span>
                  </button>
                  {pinned ? (
                    <Check size={14} className="text-[var(--ok)] shrink-0" />
                  ) : (
                    <button onClick={() => onPinSuspect(s.id)} className="icon-btn h-7 w-7" title={t('files.pin')}>
                      <Pin size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );

  if (isPhone) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 overlay-fade" onClick={() => setOpen(false)}>
        {panel}
      </div>
    );
  }
  return panel;
};
