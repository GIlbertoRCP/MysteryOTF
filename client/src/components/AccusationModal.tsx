import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Gavel, ArrowLeft, RotateCcw, Copy, Check } from 'lucide-react';
import { AccusationResult, AccusationSubmission, Mystery, Room } from '../types';
import { useI18n } from '../i18n';
import { initials } from '../cardInfo';
import { useElapsed } from './HeaderBar';

interface Props {
  mystery: Mystery;
  room: Room;
  result: AccusationResult | null;
  onSubmit: (s: AccusationSubmission) => void;
  onDismissResult: () => void;
  onClose: () => void;
  onNewCase: () => void;
}

export const AccusationModal: React.FC<Props> = ({ mystery, room, result, onSubmit, onDismissResult, onClose, onNewCase }) => {
  const { t } = useI18n();
  const [suspectId, setSuspectId] = useState('');
  const [motiveId, setMotiveId] = useState('');
  const [weaponId, setWeaponId] = useState('');
  const [alibiEvidenceId, setAlibiEvidenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const elapsed = useElapsed(room.createdAt, room.status !== 'active');
  const attemptsLeft = room.maxAttempts - room.attemptsUsed;
  const records = mystery.evidence.filter(e => e.kind === 'record');
  const complete = suspectId && motiveId && weaponId && alibiEvidenceId;

  useEffect(() => {
    setSubmitting(false);
    if (result?.status === 'solved') {
      const end = Date.now() + 900;
      const colors = ['#d6a649', '#b3261e', '#efe3c6'];
      const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [result]);

  const fmt = (ms: number) => {
    const sec = Math.round(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };

  const shareResult = async () => {
    if (!result) return;
    const label = room.daily ? t('acc.dailyLabel', { date: room.daily }) : mystery.title;
    const line = result.status === 'solved'
      ? t('acc.shareSolved', { time: fmt(result.elapsedMs ?? 0), tries: result.attemptsUsed, hints: result.hintsUsed, score: result.score ?? 0 })
      : t('acc.shareFailed', { hints: result.hintsUsed });
    const marks = Array.from({ length: result.maxAttempts }, (_, i) =>
      i < result.attemptsUsed - (result.status === 'solved' ? 1 : 0) ? '🟥' : i === result.attemptsUsed - 1 && result.status === 'solved' ? '🟩' : '⬛').join('');
    try {
      await navigator.clipboard.writeText(`Detective Board Sync · ${label}\n${marks} ${line}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const close = () => {
    if (result && result.status === 'active') onDismissResult();
    onClose();
  };

  // ─── Verdict ───
  if (result || room.status !== 'active') {
    const status = result?.status ?? room.status;
    const killer = result?.solution ? mystery.suspects.find(s => s.id === result.solution!.killerId) : undefined;
    return (
      <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div className="sheet paper relative w-full max-w-lg rounded-md px-8 pt-10 pb-7 text-center" role="dialog" aria-modal="true">
          <button onClick={close} className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--ink-soft)] hover:bg-black/5" aria-label={t('common.close')}>
            <X size={18} />
          </button>

          <div className="verdict-stamp" style={{ color: status === 'solved' ? '#2e7d4f' : '#b3261e' }}>
            <span className="stamp text-[30px] px-4 py-1.5">
              {status === 'solved'
                ? t('acc.result.solved')
                : status === 'failed'
                  ? t('acc.result.failed')
                  : t('acc.result.partial', { n: result?.correctCount ?? 0 })}
            </span>
          </div>

          {result && <p className="mt-6 text-[13px] text-[var(--ink-soft)]">{t('acc.by', { name: result.by })}</p>}

          <div className="mt-3 text-[16px] leading-relaxed text-[var(--ink)] max-w-[46ch] mx-auto">
            {status === 'solved' && (
              <>
                {result?.score !== undefined && (
                  <p className="font-typewriter text-[34px] leading-none text-[var(--ink)] tabular mb-2">{t('acc.score', { n: result.score })}</p>
                )}
                <p>{t('acc.result.solvedBody', { time: result?.elapsedMs ? fmt(result.elapsedMs) : elapsed, tries: room.attemptsUsed })}</p>
              </>
            )}
            {status === 'failed' && <p>{t('acc.result.failedBody')}</p>}
            {status === 'active' && result && <p>{t('acc.result.partialBody', { left: result.maxAttempts - result.attemptsUsed })}</p>}
            {!result && status !== 'active' && <p>{t('acc.closed')}</p>}
          </div>

          {result?.explanation && (
            <div className="mt-5 flex items-start gap-3 rounded-md bg-black/[0.05] p-4 text-left">
              {killer && (
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-typewriter text-[16px]"
                  style={{ background: `${killer.color}30`, color: '#2a1c10', border: `1.5px solid ${killer.color}` }}
                >
                  {initials(killer.name)}
                </span>
              )}
              <p className="font-typed text-[15px] leading-[1.6] text-[#2f2216]">{result.explanation}</p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {status === 'active' ? (
              <button className="btn btn-ink" onClick={close}>
                <ArrowLeft size={15} /> {t('acc.again')}
              </button>
            ) : (
              <>
                <button className="btn text-[var(--ink-soft)] hover:bg-black/5" onClick={close}>
                  {t('acc.again')}
                </button>
                {result && (
                  <button className="btn btn-ink" onClick={shareResult}>
                    {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('acc.shared') : t('acc.share')}
                  </button>
                )}
                <button className="btn btn-primary" onClick={onNewCase}>
                  <RotateCcw size={15} /> {t('acc.newCase')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── The form ───
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form
        className="sheet w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl panel shadow-2xl overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (!complete || submitting) return;
          setSubmitting(true);
          onSubmit({ suspectId, motiveId, weaponId, alibiEvidenceId });
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="font-typewriter text-[24px] text-[var(--paper)]">{t('acc.title')}</h2>
            <p className="text-[13.5px] text-[var(--text-dim)]">{t('acc.subtitle', { n: attemptsLeft })}</p>
          </div>
          <button type="button" onClick={close} className="icon-btn" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          <fieldset>
            <legend className="text-[15px] font-semibold text-[var(--text)] mb-3">{t('acc.who')}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mystery.suspects.map(s => {
                const active = suspectId === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSuspectId(s.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active ? 'border-[var(--blood-bright)] bg-blood/15' : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-typewriter text-[15px]"
                      style={{ background: `${s.color}26`, color: s.color, border: `1px solid ${s.color}66` }}
                    >
                      {initials(s.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-[var(--text)] leading-tight">{s.name}</span>
                      <span className="block text-[12px] text-[var(--text-faint)] truncate">{s.role}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid md:grid-cols-3 gap-6">
            <Choice legend={t('acc.why')} options={mystery.options.motives} value={motiveId} onChange={setMotiveId} />
            <Choice legend={t('acc.how')} options={mystery.options.weapons} value={weaponId} onChange={setWeaponId} />
            <Choice legend={t('acc.alibi')} options={records.map(r => ({ id: r.id, label: r.title }))} value={alibiEvidenceId} onChange={setAlibiEvidenceId} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
          {!complete && <span className="text-[13px] text-[var(--text-faint)]">{t('acc.incomplete')}</span>}
          <button type="submit" disabled={!complete || submitting} className="btn btn-primary px-5 py-2.5 font-typewriter tracking-wide text-[14px]">
            <Gavel size={16} /> {t('acc.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

const Choice: React.FC<{ legend: string; options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }> = ({ legend, options, value, onChange }) => (
  <fieldset>
    <legend className="text-[15px] font-semibold text-[var(--text)] mb-3">{legend}</legend>
    <div className="space-y-1" role="radiogroup">
      {options.map(o => (
        <button
          type="button"
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] transition-colors ${
            value === o.id ? 'bg-white/[0.08] text-[var(--text)]' : 'text-[var(--text-dim)] hover:bg-white/[0.03]'
          }`}
        >
          <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${value === o.id ? 'border-[var(--blood-bright)] bg-[var(--blood-bright)]' : 'border-[var(--line-strong)]'}`} />
          {o.label}
        </button>
      ))}
    </div>
  </fieldset>
);
