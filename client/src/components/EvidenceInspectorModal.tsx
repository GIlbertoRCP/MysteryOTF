import React from 'react';
import { X, Pin, Check, Radio } from 'lucide-react';
import { Evidence, Player } from '../types';
import { useI18n, TKey } from '../i18n';
import { ROLE_COLORS } from '../cardInfo';
import { KindIcon } from './KindIcon';

interface Props {
  item: Evidence;
  me: Player;
  isPinned: boolean;
  hasPartner: boolean;
  onPin: () => void;
  onTell: () => void;
  onClose: () => void;
}

export const EvidenceInspectorModal: React.FC<Props> = ({ item, me, isPinned, hasPartner, onPin, onTell, onClose }) => {
  const { t } = useI18n();
  const mine = item.role === me.role;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article
        className="sheet paper relative w-full max-w-xl rounded-md px-7 pt-7 pb-6 sm:px-9"
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

        <p className="mt-5 font-typed text-[16px] leading-[1.65] text-[#2f2216] max-w-[62ch]">{item.details}</p>

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
