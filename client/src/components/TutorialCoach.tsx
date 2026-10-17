import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useI18n, TKey } from '../i18n';

export type TutorialEvent = 'caseFile' | 'caseFileClosed' | 'pinned' | 'lab' | 'string' | 'asked' | 'accused';

// Each step finishes when its event happens.
const STEPS: { text: TKey; doneOn: TutorialEvent }[] = [
  { text: 'tut.1', doneOn: 'caseFileClosed' },
  { text: 'tut.2', doneOn: 'pinned' },
  { text: 'tut.3', doneOn: 'lab' },
  { text: 'tut.4', doneOn: 'string' },
  { text: 'tut.5', doneOn: 'asked' },
  { text: 'tut.6', doneOn: 'accused' },
];

interface Props {
  event: { type: TutorialEvent; at: number } | null;
  onSkip: () => void;
}

export const TutorialCoach: React.FC<Props> = ({ event, onSkip }) => {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!event || step >= STEPS.length) return;
    if (event.type === STEPS[step].doneOn) {
      setFlash(true);
      const id = setTimeout(() => {
        setFlash(false);
        setStep(s => s + 1);
      }, 700);
      return () => clearTimeout(id);
    }
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = step >= STEPS.length;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[min(520px,calc(100%-32px))] sheet">
      <div className="paper rounded-lg px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-[var(--ink-soft)] tabular">
            {t('tut.title')} · {done ? '✓' : t('tut.step', { n: step + 1, total: STEPS.length })}
          </span>
          <button onClick={onSkip} className="flex items-center gap-1 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
            <X size={13} /> {t('tut.skip')}
          </button>
        </div>
        <p key={step} className="toast-in mt-1.5 flex items-start gap-2 text-[15.5px] leading-snug text-[var(--ink)]">
          {flash && <Check size={18} className="mt-0.5 shrink-0 text-[#2e7d4f]" />}
          {done ? t('tut.done') : t(STEPS[step].text)}
        </p>
        <div className="mt-3 flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i < step ? 'bg-[var(--blood)]' : 'bg-ink/15'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
