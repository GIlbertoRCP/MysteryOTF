import React, { Suspense, lazy, useState } from 'react';
import { X, Pin, Check, Radio, Lamp, Loader2, Rotate3d } from 'lucide-react';
import { Evidence, Player } from '../types';
import { useI18n, TKey } from '../i18n';
import { ROLE_COLORS } from '../cardInfo';
import { KindIcon } from './KindIcon';
import { PuzzleView, CipherPuzzle } from './PuzzleView';

const Weapon3D = lazy(() => import('./Weapon3D'));

interface Props {
  caseId: string;
  item: Evidence;
  me: Player;
  isPinned: boolean;
  hasPartner: boolean;
  onPin: () => void;
  onTell: () => void;
  onClose: () => void;
}

function solvedKey(caseId: string) {
  return `dbs-solved-${caseId}`;
}

function isSolved(caseId: string, id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(solvedKey(caseId)) || '[]') as string[]).includes(id);
  } catch {
    return false;
  }
}

function rememberSolved(caseId: string, id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(solvedKey(caseId)) || '[]') as string[];
    if (!list.includes(id)) localStorage.setItem(solvedKey(caseId), JSON.stringify([...list, id]));
  } catch {
    /* storage unavailable */
  }
}

export const EvidenceInspectorModal: React.FC<Props> = ({ caseId, item, me, isPinned, hasPartner, onPin, onTell, onClose }) => {
  const { t } = useI18n();
  const mine = item.role === me.role;
  const [solved, setSolved] = useState(() => isSolved(caseId, item.id));
  const [lamp, setLamp] = useState(false);
  const needsPuzzle = !!item.puzzle && !solved;
  const markSolved = () => {
    rememberSolved(caseId, item.id);
    setSolved(true);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article
        className="sheet paper relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-md px-6 pt-7 pb-6 sm:px-9"
        style={{ background: item.role === 'analyst' ? '#e9eff0' : undefined }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ev-title"
      >
        <div className="absolute left-0 right-0 top-0 h-1.5 rounded-t-md" style={{ background: ROLE_COLORS[item.role] }} />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--ink-soft)] hover:bg-black/5" aria-label={t('common.close')}>
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--ink-soft)]">
          <KindIcon kind={item.kind} size={15} />
          <span>{t(`kind.${item.kind}` as TKey)}</span>
          <span aria-hidden>·</span>
          <span>{t('inspect.found', { role: t(`role.${item.role}` as TKey) })}</span>
        </div>

        <h2 id="ev-title" className="mt-2 font-typewriter text-[26px] leading-tight text-[var(--ink)] [text-wrap:balance]">
          {item.title}
        </h2>

        {item.weapon && (
          <div className="mt-5">
            <div className="relative h-64 overflow-hidden rounded-md bg-[#1c1612]">
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--paper)]">
                    <Loader2 className="animate-spin" />
                  </div>
                }
              >
                <Weapon3D weaponKey={item.weapon.key} residue={item.weapon.residue} lamp={lamp} />
              </Suspense>
              <span className="pointer-events-none absolute left-3 bottom-2.5 flex items-center gap-1.5 text-[12px] text-[var(--paper)]/70">
                <Rotate3d size={13} /> {t('w3d.hint')}
              </span>
            </div>
            <button
              onClick={() => setLamp(v => !v)}
              aria-pressed={lamp}
              className={`mt-2 btn ${lamp ? 'bg-[#4b2a99] text-white' : 'btn-ink'}`}
            >
              <Lamp size={15} /> {t(lamp ? 'w3d.lampOff' : 'w3d.lampOn')}
            </button>
          </div>
        )}

        {needsPuzzle ? (
          <div className="mt-5">
            {item.puzzle!.type === 'cipher' ? (
              <CipherPuzzle text={item.details} shift={item.puzzle!.shift} onSolved={markSolved} />
            ) : (
              <PuzzleView puzzle={item.puzzle!} seed={item.id} onSolved={markSolved} />
            )}
            <button onClick={markSolved} className="mt-4 text-[12.5px] font-semibold text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--ink)]">
              {t('pz.skip')}
            </button>
          </div>
        ) : (
          <>
            {item.puzzle && <span className="stamp mt-4 text-[13px] text-[#2e7d4f]">{t('pz.solved')}</span>}
            <p className="mt-5 font-typed text-[16px] leading-[1.65] text-[#2f2216] max-w-[62ch]">{item.details}</p>
          </>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-end gap-2 border-t border-ink/15 pt-4">
          <button className="btn text-[var(--ink-soft)] hover:bg-black/5" onClick={onClose}>
            {t('inspect.close')}
          </button>
          {mine && hasPartner && (
            <button
              className="btn btn-ink"
              onClick={() => {
                onTell();
                onClose();
              }}
            >
              <Radio size={15} /> {t('inspect.tell')}
            </button>
          )}
          {isPinned ? (
            <span className="btn text-[var(--ok)] cursor-default">
              <Check size={15} /> {t('inspect.pinned')}
            </span>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                onPin();
                onClose();
              }}
            >
              <Pin size={15} /> {t('inspect.pin')}
            </button>
          )}
        </div>
      </article>
    </div>
  );
};
