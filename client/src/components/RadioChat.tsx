import React, { useEffect, useRef, useState } from 'react';
import { Radio, Send, ChevronDown } from 'lucide-react';
import { ChatMessage, ChatPhraseKey, Mystery, Player } from '../types';
import { useI18n, TFn, TKey } from '../i18n';
import { ROLE_COLORS } from '../cardInfo';

interface Props {
  messages: ChatMessage[];
  me: Player;
  mystery: Mystery;
  onSend: (text: string) => void;
  onPhrase: (key: ChatPhraseKey) => void;
  /** Talking to the scripted assistant rather than a person */
  solo?: boolean;
}

const QUICK: ChatPhraseKey[] = ['need_info', 'found_something', 'agree', 'disagree', 'ready'];

export function renderMessage(msg: ChatMessage, mystery: Mystery, t: TFn): string {
  if (msg.text) return msg.text;
  const p = msg.phrase;
  if (!p) return '';
  switch (p.key) {
    case 'look_at':
    case 'bot_look':
    case 'bot_lab_ready':
      return t(`phrase.${p.key}`, { title: mystery.evidence.find(e => e.id === p.ref)?.title ?? '?' });
    case 'bot_tip':
      return t(`bot.tip.${Math.min(3, p.index ?? 0)}` as TKey);
    case 'suspicious':
    case 'innocent':
      return t(`phrase.${p.key}`, { name: mystery.suspects.find(s => s.id === p.ref)?.name ?? '?' });
    case 'quote': {
      const s = mystery.suspects.find(x => x.id === p.ref);
      const qa = s?.interview[p.index ?? 0];
      return s && qa ? t('phrase.quote', { name: s.name, q: qa.q, a: qa.a }) : '';
    }
    default:
      return t(`phrase.${p.key}` as TKey);
  }
}

export const RadioChat: React.FC<Props> = ({ messages, me, mystery, onSend, onPhrase, solo }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [readCount, setReadCount] = useState(messages.length);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setReadCount(messages.length);
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [open, messages.length]);

  const unread = Math.max(0, messages.length - readCount);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 z-10 btn panel shadow-lg text-[var(--text)] hover:border-[var(--line-strong)]"
      >
        <Radio size={16} className={unread ? 'text-[var(--blood-bright)]' : 'text-[var(--text-dim)]'} />
        {t('chat.title')}
        {unread > 0 && (
          <span className="rounded-full bg-[var(--blood)] px-1.5 text-[11px] font-bold text-white tabular">{unread}</span>
        )}
      </button>
    );
  }

  return (
    <section className="sheet absolute bottom-4 right-4 z-10 w-[min(360px,calc(100%-32px))] h-[min(480px,calc(100%-32px))] flex flex-col rounded-xl panel shadow-2xl overflow-hidden">
      <header className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <Radio size={16} className="text-[var(--blood-bright)]" />
        <h2 className="flex-1 font-typewriter text-[16px] text-[var(--paper)]">{t('chat.title')}</h2>
        <button className="icon-btn h-8 w-8" onClick={() => setOpen(false)} aria-label={t('common.close')}>
          <ChevronDown size={17} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 && <p className="px-2 pt-6 text-center text-[13px] leading-relaxed text-[var(--text-faint)]">{t('chat.empty')}</p>}
        {messages.map(msg => {
          const mine = !msg.bot && msg.sender === me.name && msg.role === me.role;
          const text = renderMessage(msg, mystery, t);
          return (
            <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="mb-0.5 flex items-center gap-1.5 px-1 text-[11.5px] text-[var(--text-faint)]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ROLE_COLORS[msg.role] }} />
                {msg.bot ? t('bot.name') : msg.sender}
                <span className="tabular">{new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <p
                className={`max-w-[88%] rounded-lg px-3 py-2 text-[14px] leading-snug ${
                  mine ? 'bg-brass/90 text-[#1b1209]' : 'bg-white/[0.06] text-[var(--text)]'
                } ${msg.phrase ? 'italic' : ''}`}
              >
                {text}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--line)] px-3 pt-2 pb-3 space-y-2">
        {!solo && <div className="text-[11.5px] font-semibold text-[var(--text-faint)]">{t('chat.quick')}</div>}
        <div className="flex flex-wrap gap-1.5">
          {(solo ? (['need_info'] as ChatPhraseKey[]) : QUICK).map(key => (
            <button
              key={key}
              onClick={() => onPhrase(key)}
              className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[12.5px] text-[var(--text-dim)] hover:border-[var(--brass-dim)] hover:text-[var(--text)] transition-colors"
            >
              {t(`phrase.${key}`)}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) onSend(draft.trim());
            setDraft('');
          }}
        >
          <input value={draft} maxLength={400} onChange={(e) => setDraft(e.target.value)} placeholder={t(solo ? 'chat.placeholderBot' : 'chat.placeholder')} className="field-dark" />
          <button type="submit" className="btn btn-brass px-3" aria-label={t('chat.send')} disabled={!draft.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </section>
  );
};
