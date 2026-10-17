import React, { useState } from 'react';
import { StringLabel } from '../types';
import { useI18n, TKey } from '../i18n';
import { STRING_COLORS } from '../cardInfo';

interface StringTagModalProps {
  onConfirm: (label: StringLabel) => void;
  onCancel: () => void;
}

const LABELS: StringLabel[] = ['link', 'motive', 'weapon', 'contradiction', 'alibi'];

export const StringTagModal: React.FC<StringTagModalProps> = ({ onConfirm, onCancel }) => {
  const { t } = useI18n();
  const [selected, setSelected] = useState<StringLabel>('link');

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="sheet w-full max-w-sm rounded-xl panel p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(selected);
        }}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <h3 className="font-typewriter text-xl text-[var(--paper)]">{t('string.title')}</h3>
        <div className="mt-4 space-y-1" role="radiogroup">
          {LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected === label}
              autoFocus={i === 0}
              onClick={() => setSelected(label)}
              onDoubleClick={() => onConfirm(label)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                selected === label ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <span className="h-[3px] w-7 rounded-full shrink-0" style={{ background: STRING_COLORS[label] }} />
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-[var(--text)]">{t(`string.${label}` as TKey)}</span>
                <span className="block text-[12.5px] text-[var(--text-dim)]">{t(`string.${label}.desc` as TKey)}</span>
              </span>
              <span className={`h-4 w-4 rounded-full border-2 ${selected === label ? 'border-[var(--brass)] bg-[var(--brass)]' : 'border-[var(--line-strong)]'}`} />
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('board.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('string.tie')}
          </button>
        </div>
      </form>
    </div>
  );
};
