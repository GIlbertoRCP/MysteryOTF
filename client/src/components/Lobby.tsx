import React, { useEffect, useState } from 'react';
import { LucideIcon, Castle, Cpu, Drama, Dice5, TrainFront, Flower2, FileSearch, UserRound, ChevronDown, RotateCcw, ArrowRight, Loader2, CalendarDays, GraduationCap, Check, Clapperboard, Snowflake, VenetianMask } from 'lucide-react';
import { Difficulty, GameMode, Lang, Role, ThemeKey } from '../types';
import { useI18n, TKey } from '../i18n';
import { todayKey, type CreateCaseOptions } from '../App';

interface LobbyProps {
  connected: boolean;
  error: string | null;
  invitedCode: string | null;
  savedSession: { code: string; name: string; role: Role } | null;
  onCreate: (opts: CreateCaseOptions) => void;
  onJoin: (code: string, name: string, role: Role) => void;
}

const THEMES: { key: ThemeKey; Icon: LucideIcon }[] = [
  { key: 'gothic', Icon: Castle },
  { key: 'express', Icon: TrainFront },
  { key: 'opera', Icon: Drama },
  { key: 'casino', Icon: Dice5 },
  { key: 'hacienda', Icon: Flower2 },
  { key: 'cyber', Icon: Cpu },
  { key: 'studio', Icon: Clapperboard },
  { key: 'arctic', Icon: Snowflake },
  { key: 'carnival', Icon: VenetianMask },
];

const DIFFICULTIES: Difficulty[] = ['Novice', 'Detective', 'Mastermind'];

// Must match dailyCase() and the theme order on the server.
const SERVER_THEME_ORDER: ThemeKey[] = ['gothic', 'cyber', 'opera', 'casino', 'express', 'hacienda', 'studio', 'arctic', 'carnival'];
function dailyTheme(date: string): ThemeKey {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SERVER_THEME_ORDER[h % SERVER_THEME_ORDER.length];
}

function dailyResult(date: string): { status: string; score: number } | null {
  try {
    return JSON.parse(localStorage.getItem(`dbs-daily-${date}`) || 'null');
  } catch {
    return null;
  }
}

function loadName() {
  try {
    return localStorage.getItem('dbs-name') || '';
  } catch {
    return '';
  }
}

export const Lobby: React.FC<LobbyProps> = ({ connected, error, invitedCode, savedSession, onCreate, onJoin }) => {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<'new' | 'join'>(invitedCode ? 'join' : 'new');
  const [name, setName] = useState(loadName);
  const [role, setRole] = useState<Role>(invitedCode ? 'analyst' : 'lead');
  const [theme, setTheme] = useState<ThemeKey>('gothic');
  const [difficulty, setDifficulty] = useState<Difficulty>('Detective');
  const [seed, setSeed] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [code, setCode] = useState(invitedCode || '');
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<GameMode>('duo');
  const [assistant, setAssistant] = useState(false);
  const today = todayKey();
  const todaysTheme = dailyTheme(today);
  const todaysResult = dailyResult(today);

  useEffect(() => {
    if (error) setPending(false);
  }, [error]);

  const finalName = () => {
    const n = name.trim() || t(role === 'lead' ? 'role.lead' : 'role.analyst');
    try {
      localStorage.setItem('dbs-name', name.trim());
    } catch {
      /* storage unavailable */
    }
    return n;
  };

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    setPending(true);
    onCreate({ name: finalName(), role, theme, difficulty, seed: seed.trim() || undefined, mode, assistant: mode === 'solo' && assistant });
  };

  const startDaily = (dailyMode: GameMode) => {
    if (!connected) return;
    setPending(true);
    onCreate({ name: finalName(), role, theme: todaysTheme, difficulty: 'Detective', mode: dailyMode, daily: today, assistant: dailyMode === 'solo' && assistant });
  };

  const startTutorial = () => {
    if (!connected) return;
    setPending(true);
    onCreate({ name: finalName(), role: 'lead', theme: 'gothic', difficulty: 'Novice', mode: 'solo', tutorial: true });
  };

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || code.trim().length < 4) return;
    setPending(true);
    onJoin(code, finalName(), role);
  };

  return (
    <div className="h-full w-full overflow-y-auto desk-bg">
      <div className="min-h-full max-w-6xl mx-auto px-4 sm:px-8 py-10 lg:py-16 grid lg:grid-cols-[1fr_minmax(0,540px)] gap-10 lg:gap-16 items-start">
        {/* Title and pitch */}
        <section className="text-left lg:sticky lg:top-16 lg:pt-6">
          <h1 className="font-typewriter text-[clamp(2.75rem,6vw,5.25rem)] leading-[0.95] text-[var(--paper)] tracking-tight">
            {t('lobby.title1')}
            <br />
            <span className="text-[var(--brass)]">{t('lobby.title2')}</span>
          </h1>
          <div className="mt-3 h-[3px] w-28 bg-[var(--blood)] rotate-[-1deg]" aria-hidden />
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[var(--text-dim)]">{t('lobby.tagline')}</p>

          <div className="mt-10 max-w-[52ch]">
            <h2 className="font-typewriter text-xl text-[var(--paper)]">{t('lobby.howTitle')}</h2>
            <ul className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--text-dim)]">
              {(['lobby.how1', 'lobby.how2', 'lobby.how3'] as TKey[]).map((k) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blood-bright)]" aria-hidden />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={startTutorial}
              disabled={!connected || pending}
              className="mt-7 group flex items-center gap-3 rounded-lg border border-[var(--line-strong)] px-4 py-3 text-left transition-colors hover:border-[var(--brass-dim)] hover:bg-white/[0.03] disabled:opacity-50"
            >
              <GraduationCap size={20} className="text-[var(--brass)] shrink-0" />
              <span>
                <span className="block text-[15px] font-semibold text-[var(--paper)]">{t('lobby.tutorial')}</span>
                <span className="block text-[13px] text-[var(--text-dim)]">{t('lobby.tutorial.desc')}</span>
              </span>
              <ArrowRight size={16} className="ml-auto text-[var(--text-faint)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </section>

        {/* The case folder (first on small screens when arriving from an invite) */}
        <section className={`relative sheet ${invitedCode ? 'order-first lg:order-none' : ''}`}>
          <div className="flex items-end gap-1 pl-4" role="tablist">
            {(['new', 'join'] as const).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`font-typewriter text-[15px] px-5 pt-2.5 pb-2 rounded-t-lg transition-colors ${
                  tab === key ? 'bg-[var(--paper)] text-[var(--ink)]' : 'bg-[#bfac82] text-[var(--ink)] hover:bg-[var(--paper-shade)]'
                }`}
              >
                {t(key === 'new' ? 'lobby.newCase' : 'lobby.joinCase')}
              </button>
            ))}
          </div>

          <form onSubmit={tab === 'new' ? submitNew : submitJoin} className="paper rounded-lg rounded-tl-none p-6 sm:p-8 space-y-6">
            {savedSession && tab === 'new' && (
              <button
                type="button"
                onClick={() => {
                  setPending(true);
                  onJoin(savedSession.code, savedSession.name, savedSession.role);
                }}
                className="w-full flex items-center justify-between gap-3 rounded-md border border-ink/20 bg-white/30 px-4 py-3 text-left text-[var(--ink)] hover:bg-white/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <RotateCcw size={16} /> {t('lobby.resume', { code: savedSession.code })}
                </span>
                <ArrowRight size={16} />
              </button>
            )}

            {tab === 'new' && (
              <div className="rounded-md bg-[var(--ink)] text-[var(--paper)] px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <CalendarDays size={18} className="mt-0.5 shrink-0 text-[var(--brass)]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-typewriter text-[17px] leading-tight">{t('lobby.daily')}</div>
                    <div className="text-[13px] text-[var(--paper-shade)]">
                      {t('lobby.daily.desc', { theme: t(`theme.${todaysTheme}` as TKey) })}
                    </div>
                  </div>
                  {todaysResult?.status === 'solved' && (
                    <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#9be0b4] shrink-0">
                      <Check size={14} /> {t('lobby.daily.done', { score: todaysResult.score })}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={!connected || pending} onClick={() => startDaily('solo')} className="btn btn-brass flex-1 py-2">
                    {t('lobby.daily.solo')}
                  </button>
                  <button
                    type="button"
                    disabled={!connected || pending}
                    onClick={() => startDaily('duo')}
                    className="btn flex-1 py-2 border border-paper/30 text-[var(--paper)] hover:bg-white/10"
                  >
                    {t('lobby.daily.duo')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'join' && invitedCode && (
              <p className="font-typewriter text-lg text-[var(--blood)]">{t('lobby.invited', { code: invitedCode })}</p>
            )}

            <div className="grid sm:grid-cols-[1fr_auto] gap-4">
              <div>
                <label className="label-ink" htmlFor="name">{t('lobby.name')}</label>
                <input
                  id="name"
                  className="field"
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('lobby.namePlaceholder')}
                  autoComplete="nickname"
                />
              </div>
              <div>
                <span className="label-ink">{t('lobby.language')}</span>
                <div className="flex rounded-md border border-ink/25 overflow-hidden h-[46px]" role="radiogroup" aria-label={t('lobby.language')}>
                  {(['en', 'es'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={lang === l}
                      onClick={() => setLang(l)}
                      className={`px-4 text-sm font-semibold transition-colors ${
                        lang === l ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:bg-black/5'
                      }`}
                    >
                      {l === 'en' ? 'English' : 'Español'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="sm:col-span-2 -mt-2 text-[13px] text-[var(--ink-soft)]">{t('lobby.languageHint')}</p>
            </div>

            {tab === 'new' && (
              <fieldset>
                <legend className="label-ink">{t('lobby.players')}</legend>
                <div className="flex rounded-md border border-ink/25 overflow-hidden" role="radiogroup">
                  {(['duo', 'solo'] as GameMode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:bg-black/5'}`}
                    >
                      {t(m === 'duo' ? 'lobby.withPartner' : 'lobby.solo')}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[13px] text-[var(--ink-soft)]">{t(mode === 'duo' ? 'lobby.withPartner.desc' : 'lobby.solo.desc')}</p>
                {mode === 'solo' && (
                  <label className="mt-3 flex items-start gap-3 rounded-md border border-ink/15 bg-white/25 px-3 py-2.5 cursor-pointer">
                    <span className="relative mt-0.5 inline-flex shrink-0">
                      <input type="checkbox" className="peer sr-only" checked={assistant} onChange={(e) => setAssistant(e.target.checked)} />
                      <span className="h-5 w-9 rounded-full bg-ink/25 transition-colors peer-checked:bg-[var(--blood)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--ink)]" />
                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-[var(--ink)]">{t('lobby.assistant')}</span>
                      <span className="block text-[12.5px] leading-snug text-[var(--ink-soft)]">{t('lobby.assistant.desc')}</span>
                    </span>
                  </label>
                )}
              </fieldset>
            )}

            {(tab === 'join' || mode === 'duo') && (
            <fieldset>
              <legend className="label-ink">{t('lobby.role')}</legend>
              <div className="grid grid-cols-2 gap-3">
                {(['lead', 'analyst'] as Role[]).map((r) => {
                  const active = role === r;
                  const Icon = r === 'lead' ? UserRound : FileSearch;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={active}
                      className={`relative text-left rounded-md p-3.5 border-2 transition-all duration-200 ${
                        active ? 'border-[var(--blood)] bg-white/55 -rotate-1 shadow-md' : 'border-ink/15 bg-white/20 hover:bg-white/35'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{ background: r === 'lead' ? 'var(--lead)' : 'var(--analyst)', color: '#1b1209' }}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="font-typewriter text-[15px] leading-tight">{t(`role.${r}`)}</span>
                      </span>
                      <span className="mt-2 block text-[13px] leading-snug text-[var(--ink-soft)]">{t(`role.${r}.desc`)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            )}

            {tab === 'new' ? (
              <>
                <fieldset>
                  <legend className="label-ink">{t('lobby.setting')}</legend>
                  <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1">
                    {THEMES.map(({ key, Icon }) => {
                      const active = theme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTheme(key)}
                          aria-pressed={active}
                          className={`flex items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                            active ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-black/5'
                          }`}
                        >
                          <Icon size={18} className={`mt-0.5 shrink-0 ${active ? 'text-[var(--brass)]' : 'text-[var(--ink-soft)]'}`} />
                          <span>
                            <span className="block text-[14px] font-semibold leading-tight">{t(`theme.${key}` as TKey)}</span>
                            <span className={`block text-[12.5px] leading-snug ${active ? 'text-[var(--paper-shade)]' : 'text-[var(--ink-soft)]'}`}>
                              {t(`theme.${key}.desc` as TKey)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="label-ink">{t('lobby.difficulty')}</legend>
                  <div className="flex rounded-md border border-ink/25 overflow-hidden" role="radiogroup">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={difficulty === d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                          difficulty === d ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:bg-black/5'
                        }`}
                      >
                        {t(`diff.${d}` as TKey)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--ink-soft)]">{t(`diff.${difficulty}.desc` as TKey)}</p>
                </fieldset>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowMore((v) => !v)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    aria-expanded={showMore}
                  >
                    <ChevronDown size={15} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} /> {t('lobby.more')}
                  </button>
                  {showMore && (
                    <div className="mt-3">
                      <label className="label-ink" htmlFor="seed">{t('lobby.seed')}</label>
                      <input
                        id="seed"
                        className="field uppercase tracking-wider"
                        value={seed}
                        maxLength={40}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="RAVEN-4821"
                      />
                      <p className="mt-1.5 text-[13px] text-[var(--ink-soft)]">{t('lobby.seedHint')}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="label-ink" htmlFor="code">{t('lobby.code')}</label>
                <input
                  id="code"
                  className="field font-typewriter text-2xl tracking-[0.35em] uppercase text-center"
                  value={code}
                  maxLength={8}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t('lobby.codePlaceholder')}
                  autoFocus={!invitedCode}
                  autoComplete="off"
                />
                <p className="mt-1.5 text-[13px] text-[var(--ink-soft)]">{t('lobby.joinHint')}</p>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-blood/10 px-3 py-2 text-[14px] text-[var(--blood)]">
                {t(error === 'soloTaken' ? 'lobby.soloTaken' : 'lobby.notFound')}
              </p>
            )}

            <button
              type="submit"
              disabled={!connected || pending || (tab === 'join' && code.trim().length < 4)}
              className="btn btn-primary w-full py-3.5 text-[15px] font-typewriter tracking-wide"
            >
              {!connected ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t('lobby.connecting')}
                </>
              ) : pending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {t(tab === 'new' ? 'lobby.start' : 'lobby.join')} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
