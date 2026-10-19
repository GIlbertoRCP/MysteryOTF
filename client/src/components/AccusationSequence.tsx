import React, { useEffect, useState } from 'react';
import { Gavel, Skull, Swords, Clock, Users } from 'lucide-react';
import { AccusationResult, Mystery } from '../types';
import { useI18n, TKey } from '../i18n';
import { Portrait } from './Portrait';
import { soundFx } from '../utils/audio';

interface Props {
  mystery: Mystery;
  result: AccusationResult;
  onDone: () => void;
}

const STEP_MS = 1500;

/**
 * The lights go down and the team's theory is read out, one point at a time,
 * before the verdict lands. It never says which point was wrong.
 */
export const AccusationSequence: React.FC<Props> = ({ mystery, result, onDone }) => {
  const { t } = useI18n();
  const sub = result.submission;
  const accused = mystery.suspects.find(s => s.id === sub?.suspectId);
  const accomplice = mystery.suspects.find(s => s.id === sub?.accompliceId);
  const alibi = mystery.evidence.find(e => e.id === sub?.alibiEvidenceId);
  const holds = result.correctCount === result.total;

  const points: { key: TKey; icon: React.ReactNode; value: string; note?: string }[] = [
    { key: 'seq.motive', icon: <Skull size={18} />, value: mystery.options.motives.find(m => m.id === sub?.motiveId)?.label ?? '?' },
    { key: 'seq.means', icon: <Swords size={18} />, value: mystery.options.weapons.find(w => w.id === sub?.weaponId)?.label ?? '?' },
    { key: 'seq.opportunity', icon: <Clock size={18} />, value: alibi?.title ?? '?', note: alibi?.summary },
  ];
  if (accomplice) points.push({ key: 'seq.accomplice', icon: <Users size={18} />, value: accomplice.name });

  // 0 = title, 1..n = points, n+1 = verdict
  const [step, setStep] = useState(0);
  const verdictStep = points.length + 1;

  useEffect(() => {
    if (!sub || !accused || step > verdictStep) {
      onDone();
      return;
    }
    if (step === verdictStep) (holds ? soundFx.solved : soundFx.wrong).call(soundFx);
    else if (step > 0) soundFx.paper();
    const id = setTimeout(() => setStep(s => s + 1), step === verdictStep ? 2400 : step === 0 ? 1800 : STEP_MS);
    return () => clearTimeout(id);
    // onDone is stable enough for a one-shot sequence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!sub || !accused) {
    // Nothing to stage (e.g. an old server); the effect goes straight to the verdict.
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 seq-dim" role="dialog" aria-modal="true" aria-live="polite">
      <div className="absolute inset-0 seq-spot pointer-events-none" />
      <button onClick={onDone} className="btn panel absolute top-4 right-4 z-10 text-[13px] text-[var(--text-dim)] hover:text-[var(--text)]">
        {t('seq.skip')}
      </button>

      <div className="relative w-full max-w-2xl text-center">
        <div className="seq-rise flex flex-col items-center">
          <Portrait suspect={accused} mood={step >= verdictStep && !holds ? 'calm' : 'nervous'} size={112} rounded />
          <h2 className="mt-4 font-typewriter text-[30px] sm:text-[38px] leading-tight text-[var(--paper)] [text-wrap:balance]">
            {t('seq.title', { name: accused.name })}
          </h2>
          <p className="mt-1 text-[13.5px] text-[var(--text-faint)]">{t('seq.by', { name: result.by })}</p>
        </div>

        <ol className="mt-7 grid gap-2.5 text-left">
          {points.map((p, i) =>
            step > i ? (
              <li key={p.key} className="seq-slam flex items-start gap-3 rounded-lg border border-[var(--line)] bg-black/40 px-4 py-3">
                <span className="mt-0.5 text-[var(--brass)]">{p.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">{t(p.key)}</span>
                  <span className="block font-typed text-[18px] text-[var(--paper)]">{p.value}</span>
                  {p.note && <span className="block text-[13px] text-[var(--text-dim)] line-clamp-2">{p.note}</span>}
                </span>
              </li>
            ) : (
              <li key={p.key} className="h-[58px] rounded-lg border border-dashed border-white/5" />
            )
          )}
        </ol>

        {step >= verdictStep && (
          <div className="seq-verdict mt-8 flex flex-col items-center">
            {holds ? (
              <span className="stamp text-[26px] sm:text-[32px] text-[var(--ok)] flex items-center gap-3">
                <Gavel size={28} /> {t('seq.holds')}
              </span>
            ) : (
              <>
                <span className="font-typewriter text-[52px] sm:text-[72px] leading-none text-[var(--blood-bright)] seq-objection">{t('seq.objection')}</span>
                <span className="mt-2 text-[15px] text-[var(--text-dim)]">{t('seq.falls')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
