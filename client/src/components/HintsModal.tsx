import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';

interface Props {
  hints: string[];
  used: number;
  max: number;
  active: boolean;
  onReveal: () => void;
  onClose: () => void;
}

export const HintsModal: React.FC<Props> = ({ hints, used, max, active, onReveal, onClose }) => {
  const { t } = useI18n();
  // Blocks double clicks until the server confirms the hint we asked for.
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const canReveal = active && used < max && requestedAt !== used;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet w-full max-w-lg rounded-xl panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="hints-title">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 id="hints-title" className="font-typewriter text-[22px] text-[var(--paper)]">{t('hint.title')}</h2>
            <p className="text-[13.5px] text-[var(--text-dim)]">{t('hint.cost')}</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {hints.length === 0 ? (
            <p className="text-[14px] text-[var(--text-faint)]">{t('hint.none')}</p>
          ) : (
            <ol className="space-y-3">
              {hints.map((h, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[var(--text)]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brass)] text-[12px] font-bold text-[#24170a] tabular">{i + 1}</span>
                  <span>{h}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-5 py-4">
          {used >= max ? (
            <span className="text-[13.5px] text-[var(--text-dim)]">{t('hint.allUsed')}</span>
          ) : (
            <button
              className="btn btn-brass"
              disabled={!canReveal}
              onClick={() => {
                setRequestedAt(used);
                onReveal();
              }}
            >
              <Lightbulb size={15} /> {t('hint.reveal', { n: used + 1, total: max })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
