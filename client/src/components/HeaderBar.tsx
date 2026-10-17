import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, BookOpen, MessagesSquare, Gavel, Link2, Check, Settings2, LayoutGrid, Camera, Volume2, VolumeX, LogOut, Clock } from 'lucide-react';
import { BoardStyle, Lang, Mystery, Player, Room } from '../types';
import { useI18n, TKey } from '../i18n';
import { ROLE_COLORS } from '../cardInfo';
import { soundFx } from '../utils/audio';
import { inviteLink } from '../App';

interface HeaderBarProps {
  room: Room;
  mystery: Mystery;
  me: Player;
  boardStyle: BoardStyle;
  onBoardStyle: (s: BoardStyle) => void;
  onOpenCaseFile: () => void;
  onOpenInterrogation: () => void;
  onOpenAccusation: () => void;
  onOpenHints: () => void;
  onTidy: () => void;
  onExport: () => void;
  onLeave: () => void;
  onCopied: () => void;
}

export function useElapsed(since: number, frozen: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [frozen]);
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  room, mystery, me, boardStyle, onBoardStyle, onOpenCaseFile, onOpenInterrogation, onOpenAccusation, onOpenHints, onTidy, onExport, onLeave, onCopied,
}) => {
  const { t, lang, setLang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(soundFx.isEnabled());
  const menuRef = useRef<HTMLDivElement | null>(null);
  const elapsed = useElapsed(room.createdAt, room.status !== 'active');
  const attemptsLeft = room.maxAttempts - room.attemptsUsed;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(room.roomCode));
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const slots: { role: 'lead' | 'analyst'; player?: Player }[] = [
    { role: 'lead', player: room.players.find(p => p.role === 'lead') },
    { role: 'analyst', player: room.players.find(p => p.role === 'analyst') },
  ];

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-3 sm:px-4 bg-[var(--bg-raised)] border-b border-[var(--line)] relative z-30">
      {/* Case identity */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <div className="hidden sm:block font-typewriter text-[17px] leading-tight text-[var(--paper)] truncate">{mystery.title}</div>
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-faint)]">
            <span className="tabular tracking-wider whitespace-nowrap">{t('header.case')} {room.roomCode}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{t(`diff.${mystery.difficulty}` as TKey)}</span>
          </div>
        </div>
        {room.mode === 'duo' && (
          <button onClick={copyInvite} className="icon-btn shrink-0" title={t('header.copy')} aria-label={t('header.copy')}>
            {copied ? <Check size={16} className="text-[var(--ok)]" /> : <Link2 size={16} />}
          </button>
        )}
      </div>

      {/* Main tools */}
      <nav className="flex items-center gap-1">
        <button onClick={onOpenCaseFile} className="btn btn-ghost border-transparent px-2 md:px-3.5" aria-keyshortcuts="C" aria-label={t('header.caseFile')}>
          <BookOpen size={16} /> <span className="hidden md:inline">{t('header.caseFile')}</span>
        </button>
        <button onClick={onOpenInterrogation} className="btn btn-ghost border-transparent px-2 md:px-3.5" aria-keyshortcuts="I" aria-label={t('header.interrogate')}>
          <MessagesSquare size={16} /> <span className="hidden md:inline">{t('header.interrogate')}</span>
        </button>
        <button onClick={onOpenHints} className="btn btn-ghost border-transparent px-2 md:px-3.5" aria-label={t('header.hint')}>
          <Lightbulb size={16} className={room.hintsUsed ? 'text-[var(--brass)]' : ''} />
          <span className="hidden md:inline">{t('header.hint')}</span>
          {room.hintsUsed > 0 && <span className="text-[11px] tabular text-[var(--text-faint)]">{room.hintsUsed}/{room.maxHints}</span>}
        </button>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
        {/* Who is here */}
        <div className="hidden lg:flex items-center gap-2">
          {(room.mode === 'solo' ? slots.filter(sl => sl.player) : slots).map(({ role, player }) => (
            <div
              key={role}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] ${player ? 'border-[var(--line-strong)]' : 'border-dashed border-[var(--line)] text-[var(--text-faint)]'}`}
              title={t(`role.${role}`)}
            >
              <span className={`h-2 w-2 rounded-full ${player ? '' : 'opacity-40'}`} style={{ background: ROLE_COLORS[role] }} />
              <span className="max-w-[110px] truncate">{player ? player.name : t('header.waiting')}</span>
              {player && player.socketId === me.socketId && <span className="text-[var(--text-faint)]">({t('header.you')})</span>}
              {player && player.lang !== lang && <span className="text-[10px] font-bold uppercase text-[var(--text-faint)]">{player.lang}</span>}
            </div>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-[var(--text-dim)] tabular" >
          <Clock size={14} className="text-[var(--text-faint)]" /> {elapsed}
        </div>

        <div className="hidden sm:flex rounded-md border border-[var(--line)] overflow-hidden text-[12px] font-bold" role="radiogroup" aria-label="Language">
          {(['en', 'es'] as Lang[]).map(l => (
            <button
              key={l}
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 uppercase transition-colors ${lang === l ? 'bg-[var(--brass)] text-[#24170a]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} className="icon-btn" aria-label={t('header.settings')} aria-expanded={menuOpen}>
            <Settings2 size={17} />
          </button>
          {menuOpen && (
            <div className="sheet absolute right-0 top-11 w-64 rounded-lg panel p-2 shadow-2xl text-[14px]">
              <div className="px-2 pt-1 pb-2 text-[12px] font-semibold text-[var(--text-faint)]">{t('header.boardStyle')}</div>
              <div className="grid grid-cols-2 gap-1 px-1 pb-2">
                {(['mindplace', 'corkboard', 'blackboard', 'blueprint'] as BoardStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => onBoardStyle(s)}
                    className={`rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                      boardStyle === s ? 'bg-[var(--brass)] text-[#24170a] font-semibold' : 'hover:bg-white/5 text-[var(--text-dim)]'
                    }`}
                  >
                    {t(`style.${s}` as TKey)}
                  </button>
                ))}
              </div>
              <div className="sm:hidden flex gap-1 px-1 pb-2">
                {(['en', 'es'] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[13px] ${lang === l ? 'bg-[var(--brass)] text-[#24170a] font-semibold' : 'text-[var(--text-dim)] hover:bg-white/5'}`}
                  >
                    {l === 'en' ? 'English' : 'Español'}
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--line)] my-1" />
              <MenuItem icon={<LayoutGrid size={15} />} label={t('header.tidy')} hint="T" onClick={() => { onTidy(); setMenuOpen(false); }} />
              <MenuItem icon={<Camera size={15} />} label={t('header.export')} onClick={() => { onExport(); setMenuOpen(false); }} />
              <MenuItem
                icon={soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                label={`${t('header.sound')}: ${soundOn ? t('common.on') : t('common.off')}`}
                onClick={() => {
                  soundFx.setEnabled(!soundOn);
                  setSoundOn(!soundOn);
                  if (!soundOn) soundFx.pin();
                }}
              />
              <div className="border-t border-[var(--line)] my-1" />
              <MenuItem icon={<LogOut size={15} />} label={t('header.leave')} onClick={onLeave} danger />
            </div>
          )}
        </div>

        <button onClick={onOpenAccusation} className="btn btn-primary font-typewriter tracking-wide">
          <Gavel size={16} />
          <span className="hidden sm:inline">{t('header.accuse')}</span>
          {room.status === 'active' && (
            <span className="rounded bg-black/25 px-1.5 py-px text-[11px] font-sans font-bold tabular">{t('header.attemptsLeft', { n: attemptsLeft })}</span>
          )}
        </button>
      </div>
    </header>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }> = ({ icon, label, hint, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5 ${danger ? 'text-[var(--blood-bright)]' : 'text-[var(--text)]'}`}
  >
    <span className="text-[var(--text-faint)]">{icon}</span>
    <span className="flex-1">{label}</span>
    {hint && <kbd className="text-[11px] text-[var(--text-faint)] border border-[var(--line)] rounded px-1">{hint}</kbd>}
  </button>
);
