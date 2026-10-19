import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AccusationResult, AccusationSubmission, BoardCard, BoardString, BoardStyle, CardKind, ChatMessage, ChatPhraseKey, ConfrontEntry, SearchEntry,
  Difficulty, GameMode, LabState, Mystery, Player, Role, Room, StatusTag, StringLabel, ThemeKey,
} from './types';
import { I18nProvider, useI18n } from './i18n';
import { soundFx } from './utils/audio';
import { findFreeSpot, tidyPositions } from './boardLayout';
import { cardTitle } from './cardInfo';
import { Lobby } from './components/Lobby';
import { HeaderBar } from './components/HeaderBar';
import { CorkboardCanvas, CorkboardCanvasRef } from './components/CorkboardCanvas';
import { FilesPanel } from './components/FilesPanel';
import { EvidenceInspectorModal } from './components/EvidenceInspectorModal';
import { CaseFileModal } from './components/CaseFileModal';
import { InterrogationModal } from './components/InterrogationModal';
import { AccusationSequence } from './components/AccusationSequence';
import { AccusationModal } from './components/AccusationModal';
import { DossierModal } from './components/DossierModal';
import { RadioChat } from './components/RadioChat';
import { Toasts, Toast } from './components/Toasts';
import { HintsModal } from './components/HintsModal';
import { TutorialCoach, TutorialEvent } from './components/TutorialCoach';
import { FloorPlanModal } from './components/FloorPlanModal';
import { TimelinePanel } from './components/TimelinePanel';
import { WeatherLayer } from './components/WeatherLayer';
import { GanttChart } from 'lucide-react';

interface Session {
  code: string;
  name: string;
  role: Role;
}

export interface CreateCaseOptions {
  name: string;
  role: Role;
  theme: ThemeKey;
  difficulty: Difficulty;
  seed?: string;
  mode: GameMode;
  assistant?: boolean;
  tutorial?: boolean;
  daily?: string;
}

/** Today's date in the player's own time zone, as YYYY-MM-DD. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SESSION_KEY = 'dbs-session';

/**
 * A stable id for this tab, so a refresh or a dropped connection gets the same seat back.
 * Per tab (not per browser) so two tabs can still play against each other.
 */
function getPlayerId(): string {
  try {
    let id = sessionStorage.getItem('dbs-player-id');
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
      sessionStorage.setItem('dbs-player-id', id);
    }
    return id;
  } catch {
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
const PLAYER_ID = getPlayerId();

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

function readPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'on';
  } catch {
    return fallback;
  }
}

function writePref(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
}

export function inviteLink(code: string) {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

const Game: React.FC = () => {
  const { lang, t } = useI18n();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [partnerCursor, setPartnerCursor] = useState<{ x: number; y: number; name: string; role: Role } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [result, setResult] = useState<AccusationResult | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [confrontations, setConfrontations] = useState<ConfrontEntry[]>([]);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [sequence, setSequence] = useState<AccusationResult | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [flashlight, setFlashlight] = useState(() => readPref('dbs-flashlight', false));
  const [weather, setWeather] = useState(() => readPref('dbs-weather', !window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  const [tutorialEvent, setTutorialEvent] = useState<{ type: TutorialEvent; at: number } | null>(null);
  const fireTutorial = (type: TutorialEvent) => setTutorialEvent({ type, at: Date.now() });

  const [inspectId, setInspectId] = useState<string | null>(null);
  const [caseFileOpen, setCaseFileOpen] = useState(false);
  const [interrogationOpen, setInterrogationOpen] = useState(false);
  const [accusationOpen, setAccusationOpen] = useState(false);
  const [boardStyle, setBoardStyle] = useState<BoardStyle>(() => {
    try {
      return (localStorage.getItem('dbs-board-style') as BoardStyle) || 'mindplace';
    } catch {
      return 'mindplace';
    }
  });

  const canvasRef = useRef<CorkboardCanvasRef | null>(null);
  const mysteryRef = useRef<Mystery | null>(null);
  const meRef = useRef<Player | null>(null);
  const tRef = useRef(t);
  // After a refresh mid-game, go straight back into the same case.
  const sessionRef = useRef<Session | null>(
    (() => {
      // Only the tab that was actually in this case rejoins on its own; another tab
      // opening the same invite link should still see the lobby.
      const saved = loadSession();
      const urlCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      let activeHere: string | null = null;
      try {
        activeHere = sessionStorage.getItem('dbs-active-room');
      } catch {
        /* storage unavailable */
      }
      return saved && urlCode === saved.code && activeHere === saved.code ? saved : null;
    })()
  );
  const roomRef = useRef<Room | null>(null);
  roomRef.current = room;
  mysteryRef.current = mystery;
  meRef.current = me;
  tRef.current = t;

  const invitedCode = useMemo(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase() || null, []);

  const pushToast = useCallback((text: string, role?: Role) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-3), { id, text, role }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  }, []);

  // ─── Socket lifecycle ───
  useEffect(() => {
    const backendUrl = window.location.port === '5173' ? `http://${window.location.hostname}:3001` : window.location.origin;
    const s = io(backendUrl, { transports: ['websocket', 'polling'] });

    s.on('connect', () => {
      setConnected(true);
      // Coming back after a dropped connection: rejoin the same case.
      const session = sessionRef.current;
      if (session) {
        s.emit('room:join', { code: session.code, playerId: PLAYER_ID, name: session.name, role: session.role, lang: localStorage.getItem('dbs-lang') || 'en' });
      }
    });
    s.on('disconnect', () => setConnected(false));

    s.on('room:joined', ({ room, mystery, you, hints, confrontations, searches }: { room: Room; mystery: Mystery; you: Player; hints: string[]; confrontations: ConfrontEntry[]; searches: SearchEntry[] }) => {
      setRoom(room);
      setMystery(mystery);
      setHints(hints || []);
      setConfrontations(confrontations || []);
      setSearches(searches || []);
      if (mystery.modifier && Object.keys(room.cards).length <= mystery.suspects.length) {
        pushToast(tRef.current('toast.modifier', { label: mystery.modifier.label }));
      }
      setMe(you);
      setJoinError(null);
      const session = { code: room.roomCode, name: you.name, role: you.role };
      sessionRef.current = session;
      saveSession(session);
      try {
        sessionStorage.setItem('dbs-active-room', room.roomCode);
      } catch {
        /* storage unavailable */
      }
      window.history.replaceState(null, '', `?room=${room.roomCode}`);
      soundFx.paper();
    });

    s.on('room:error', ({ code }: { code?: string } = {}) => {
      sessionRef.current = null;
      saveSession(null);
      setRoom(null);
      setJoinError(code === 'solo' ? 'soloTaken' : 'notFound');
      window.history.replaceState(null, '', window.location.pathname);
    });

    s.on('room:mystery', ({ mystery, hints, confrontations, searches, lateLead }: { mystery: Mystery; hints: string[]; confrontations?: ConfrontEntry[]; searches?: SearchEntry[]; lateLead?: string }) => {
      setMystery(mystery);
      setHints(hints || []);
      if (confrontations) setConfrontations(confrontations);
      if (searches) setSearches(searches);
      if (lateLead) {
        const ev = mystery.evidence.find(e => e.id === lateLead);
        // Both players hear about it, but only the owner of the file sees it in their sidebar.
        if (ev) pushToast(tRef.current('toast.lateLead', { title: ev.title }), ev.role);
        soundFx.radio();
      }
    });

    s.on('room:searched', ({ entry }: { entry: SearchEntry }) => {
      setSearches(prev => (prev.some(x => x.spotId === entry.spotId) ? prev : [...prev, entry]));
      soundFx.paper();
      if (entry.found.length && mysteryRef.current) {
        const titles = entry.found.map(id => mysteryRef.current!.evidence.find(e => e.id === id)?.title).filter(Boolean).join(', ');
        pushToast(tRef.current('toast.found', { name: entry.by, title: titles }));
      }
    });

    s.on('suspect:confronted', ({ entry, wastedConfronts }: { entry: ConfrontEntry; wastedConfronts?: number; repeat?: boolean }) => {
      setConfrontations(prev =>
        prev.some(c => c.suspectId === entry.suspectId && c.evidenceId === entry.evidenceId) ? prev : [...prev, entry]
      );
      if (wastedConfronts !== undefined) setRoom(prev => (prev ? { ...prev, wastedConfronts } : prev));
      if (entry.cracked) soundFx.string();
      else soundFx.paper();
      if (entry.by !== meRef.current?.name && mysteryRef.current) {
        const suspect = mysteryRef.current.suspects.find(x => x.id === entry.suspectId)?.name ?? '';
        pushToast(tRef.current('toast.confronted', { name: entry.by, suspect }));
      }
    });

    s.on('lab:update', ({ lab }: { lab: LabState }) => {
      const before = roomRef.current?.lab?.unlocked.length ?? 0;
      if (lab.unlocked.length > before) {
        const id = lab.unlocked[lab.unlocked.length - 1];
        const title = mysteryRef.current?.evidence.find(e => e.id === id)?.title ?? '';
        soundFx.radio();
        if (!roomRef.current?.assistant) pushToast(tRef.current('toast.labReady', { title }), 'analyst');
      }
      setRoom(prev => (prev ? { ...prev, lab } : prev));
    });

    s.on('case:hints', ({ hints, hintsUsed }: { hints: string[]; hintsUsed: number }) => {
      setHints(hints);
      setRoom(prev => (prev ? { ...prev, hintsUsed } : prev));
      soundFx.paper();
    });

    s.on('room:players', ({ players, joined, returned, left }: { players: Player[]; joined?: string; returned?: string; left?: string }) => {
      const before = new Map((roomRef.current?.players ?? []).map(p => [p.id, p]));
      for (const p of players) {
        // A partner whose connection just dropped: their seat is being held.
        if (p.id !== meRef.current?.id && before.get(p.id)?.connected && !p.connected) {
          pushToast(tRef.current('toast.lostConnection', { name: p.name }));
        }
      }
      setRoom(prev => (prev ? { ...prev, players } : prev));
      if (joined) {
        pushToast(tRef.current('toast.joined', { name: joined }));
        soundFx.radio();
      }
      if (returned) pushToast(tRef.current('toast.back', { name: returned }));
      if (left) {
        pushToast(tRef.current('toast.leftNamed', { name: left }));
        setPartnerCursor(null);
      }
    });

    s.on('card:added', ({ card, by }: { card: BoardCard; by: string }) => {
      setRoom(prev => (prev ? { ...prev, cards: { ...prev.cards, [card.id]: card } } : prev));
      soundFx.pin();
      if (by !== meRef.current?.name && mysteryRef.current) {
        const role = mysteryRef.current.evidence.find(e => e.id === card.refId)?.role;
        pushToast(
          card.kind === 'note'
            ? tRef.current('toast.note', { name: by })
            : tRef.current('toast.pinned', { name: by, title: cardTitle(card, mysteryRef.current) }),
          role
        );
      }
    });

    s.on('card:moved', ({ cardId, x, y }) => {
      setRoom(prev => {
        if (!prev || !prev.cards[cardId]) return prev;
        return { ...prev, cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], x, y } } };
      });
    });

    s.on('card:tagged', ({ cardId, tag, by }: { cardId: string; tag: StatusTag | null; by: string }) => {
      const existing = roomRef.current?.cards[cardId];
      if (existing && tag && by !== meRef.current?.name && mysteryRef.current) {
        pushToast(tRef.current('toast.tagged', { name: by, title: cardTitle(existing, mysteryRef.current), tag: tRef.current(`board.tag.${tag}`) }));
      }
      setRoom(prev => {
        if (!prev || !prev.cards[cardId]) return prev;
        return { ...prev, cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], statusTag: tag ?? undefined } } };
      });
    });

    s.on('card:removed', ({ cardId, removedStrings }: { cardId: string; removedStrings: string[] }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const cards = { ...prev.cards };
        delete cards[cardId];
        const strings = { ...prev.strings };
        removedStrings.forEach(id => delete strings[id]);
        return { ...prev, cards, strings };
      });
    });

    s.on('string:created', ({ string, by }: { string: BoardString; by: string }) => {
      setRoom(prev => (prev ? { ...prev, strings: { ...prev.strings, [string.id]: string } } : prev));
      soundFx.string();
      if (by !== meRef.current?.name) {
        pushToast(tRef.current('toast.string', { name: by, label: tRef.current(`string.${string.label}`).toLowerCase() }));
      }
    });

    s.on('string:deleted', ({ stringId }: { stringId: string }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const strings = { ...prev.strings };
        delete strings[stringId];
        return { ...prev, strings };
      });
    });

    s.on('presence:cursor', ({ x, y, name, role }) => setPartnerCursor({ x, y, name, role }));

    s.on('chat:message', (msg: ChatMessage) => {
      setRoom(prev => (prev ? { ...prev, chat: [...prev.chat, msg] } : prev));
      if (msg.sender !== meRef.current?.name) soundFx.radio();
    });

    s.on('case:result', (res: AccusationResult) => {
      setResult(res);
      // Play the case out first; the verdict opens when the sequence ends.
      setAccusationOpen(false);
      setSequence(res);
      setRoom(prev => (prev ? { ...prev, status: res.status, attemptsUsed: res.attemptsUsed, score: res.score ?? prev.score } : prev));
      const daily = roomRef.current?.daily;
      if (daily && res.status !== 'active') {
        try {
          localStorage.setItem(`dbs-daily-${daily}`, JSON.stringify({ status: res.status, score: res.score ?? 0 }));
        } catch {
          /* storage unavailable */
        }
      }
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [pushToast]);

  // Offer to resume a case after a page refresh.
  const savedSession = useMemo(() => loadSession(), []);

  // Tell the server when this player switches language mid-game.
  useEffect(() => {
    if (socket && room && me && me.lang !== lang) {
      socket.emit('room:set_lang', { lang });
      setMe({ ...me, lang });
    }
  }, [lang, socket, room, me]);

  // ─── Lobby actions ───
  const createCase = (opts: CreateCaseOptions) => {
    setJoinError(null);
    socket?.emit('room:create', { ...opts, playerId: PLAYER_ID, lang });
  };

  const joinCase = (code: string, name: string, role: Role) => {
    setJoinError(null);
    socket?.emit('room:join', { code: code.trim().toUpperCase(), playerId: PLAYER_ID, name, role, lang });
  };

  const leaveCase = () => {
    socket?.emit('room:leave');
    sessionRef.current = null;
    saveSession(null);
    try {
      sessionStorage.removeItem('dbs-active-room');
    } catch {
      /* storage unavailable */
    }
    setRoom(null);
    setMystery(null);
    setMe(null);
    setResult(null);
    setHints([]);
    setConfrontations([]);
    setSearches([]);
    setSequence(null);
    setDossierOpen(false);
    setHintsOpen(false);
    setAccusationOpen(false);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // ─── Board actions ───
  const placeCard = (kind: CardKind, refId: string, at?: { x: number; y: number }, text?: string) => {
    if (!socket || !room) return;
    const near = at ?? canvasRef.current?.getViewCenter() ?? { x: 500, y: 500 };
    const pos = at ? { x: at.x - 90, y: at.y - 40 } : findFreeSpot(Object.values(room.cards), kind, near);
    socket.emit('card:add', { card: { kind, refId, text, x: pos.x, y: pos.y, rotation: (Math.random() - 0.5) * 7 } });
    if (kind === 'evidence') fireTutorial('pinned');
  };

  const moveCard = (cardId: string, x: number, y: number, final: boolean) => {
    setRoom(prev => (prev && prev.cards[cardId] ? { ...prev, cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], x, y } } } : prev));
    if (final || Math.random() < 0.5) socket?.emit('card:move', { cardId, x, y });
  };

  const tidyBoard = () => {
    if (!room || !mystery) return;
    const roleOf = (c: BoardCard) => mystery.evidence.find(e => e.id === c.refId)?.role;
    const positions = tidyPositions(Object.values(room.cards), roleOf);
    Object.entries(positions).forEach(([id, p]) => moveCard(id, p.x, p.y, true));
    setTimeout(() => canvasRef.current?.fitToContent(), 50);
  };

  const sendPhrase = (key: ChatPhraseKey, ref?: string, index?: number) => socket?.emit('chat:send', { phrase: { key, ref, index } });

  // ─── Hotkeys ───
  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        if (caseFileOpen) fireTutorial('caseFileClosed');
        setCaseFileOpen(false);
        setInterrogationOpen(false);
        setAccusationOpen(false);
        setPlanOpen(false);
        setInspectId(null);
      } else if (key === 'c') {
        setCaseFileOpen(v => !v);
        fireTutorial('caseFile');
      }
      else if (key === 'i') setInterrogationOpen(v => !v);
      else if (key === 'p') setPlanOpen(v => !v);
      else if (key === 't') tidyBoard();
      else if (key === 'f') canvasRef.current?.fitToContent();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!room || !mystery || !me) {
    return (
      <Lobby
        connected={connected}
        error={joinError}
        invitedCode={invitedCode}
        savedSession={savedSession}
        onCreate={createCase}
        onJoin={joinCase}
      />
    );
  }

  const partner = room.players.find(p => p.id !== me.id);
  const pinnedRefs = new Set(Object.values(room.cards).map(c => c.refId));
  const inspectItem = inspectId ? mystery.evidence.find(e => e.id === inspectId) : null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0b0806] text-amber-50">
      {!connected && (
        <div role="status" className="shrink-0 flex items-center justify-center gap-2 bg-[var(--blood)] px-3 py-1.5 text-[13px] font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {t('conn.lost')}
        </div>
      )}

      <HeaderBar
        room={room}
        mystery={mystery}
        me={me}
        boardStyle={boardStyle}
        onBoardStyle={(s) => {
          setBoardStyle(s);
          try {
            localStorage.setItem('dbs-board-style', s);
          } catch {
            /* storage unavailable */
          }
        }}
        onOpenCaseFile={() => {
          setCaseFileOpen(true);
          fireTutorial('caseFile');
        }}
        onOpenInterrogation={() => setInterrogationOpen(true)}
        onOpenHints={() => setHintsOpen(true)}
        onOpenPlan={() => setPlanOpen(true)}
        flashlight={flashlight}
        onFlashlight={(on) => {
          setFlashlight(on);
          writePref('dbs-flashlight', on);
        }}
        weather={weather}
        onWeather={(on) => {
          setWeather(on);
          writePref('dbs-weather', on);
        }}
        onOpenAccusation={() => setAccusationOpen(true)}
        onTidy={tidyBoard}
        onExport={() => canvasRef.current?.exportSnapshot()}
        onLeave={leaveCase}
        onCopied={() => pushToast(t('toast.copied'))}
      />

      <div className="flex-1 flex min-h-0 relative">
        <FilesPanel
          mystery={mystery}
          me={me}
          pinnedRefs={pinnedRefs}
          onPin={(id) => placeCard('evidence', id)}
          onPinSuspect={(id) => placeCard('suspect', id)}
          onInspect={(id) => setInspectId(id)}
          onOpenSuspects={() => setCaseFileOpen(true)}
          lab={room.lab}
          difficulty={mystery.difficulty}
          tutorial={room.tutorial}
          foundItems={new Set(searches.flatMap(x => x.found))}
          onOpenPlan={() => setPlanOpen(true)}
          onRequestLab={(id) => {
            socket?.emit('lab:request', { evidenceId: id });
            fireTutorial('lab');
          }}
        />

        <div className={`flex-1 relative min-w-0 verdict-camera ${(sequence || (accusationOpen && result && result.status !== 'active')) ? 'verdict-zoom' : ''}`}>
          <CorkboardCanvas
            ref={canvasRef}
            room={room}
            mystery={mystery}
            me={me}
            partner={partner}
            solo={room.mode === 'solo'}
            boardStyle={boardStyle}
            partnerCursor={partner?.connected ? partnerCursor : null}
            onMoveCard={moveCard}
            onDropFile={(kind, refId, at) => placeCard(kind, refId, at)}
            onAddNote={(text) => placeCard('note', 'note', undefined, text)}
            onTag={(cardId, tag) => socket?.emit('card:tag', { cardId, tag })}
            onRemove={(cardId) => socket?.emit('card:remove', { cardId })}
            onCreateString={(from, to, label: StringLabel) => {
              socket?.emit('string:create', { from, to, label });
              fireTutorial('string');
            }}
            onDeleteString={(stringId) => socket?.emit('string:delete', { stringId })}
            onInspect={(card) => {
              if (card.kind === 'evidence') setInspectId(card.refId);
              else if (card.kind === 'suspect') setInterrogationOpen(true);
            }}
            onCursor={(x, y) => socket?.emit('presence:cursor', { x, y })}
            onCopied={() => pushToast(t('toast.copied'))}
            flashlight={flashlight || mystery.modifier?.key === 'blackout'}
            confrontations={confrontations}
            extraTools={
              <button
                onClick={() => setTimelineOpen(v => !v)}
                aria-pressed={timelineOpen}
                className={`btn panel shadow-lg ${timelineOpen ? 'text-[var(--brass)] border-[var(--brass-dim)]' : 'text-[var(--text)]'}`}
                title={t('tl.title')}
              >
                <GanttChart size={16} /> <span className="hidden sm:inline">{t('tl.title')}</span>
              </button>
            }
          />

          {(weather || mystery.modifier?.key === 'storm') && <WeatherLayer theme={mystery.theme} storm={mystery.modifier?.key === 'storm'} />}

          {timelineOpen && (
            <TimelinePanel mystery={mystery} pinnedRefs={pinnedRefs} onInspect={(id) => setInspectId(id)} onClose={() => setTimelineOpen(false)} />
          )}

          {(room.mode === 'duo' || room.assistant) && (
          <RadioChat
            messages={room.chat}
            me={me}
            mystery={mystery}
            onSend={(text) => socket?.emit('chat:send', { text })}
            onPhrase={sendPhrase}
            solo={room.mode === 'solo'}
            noisy={mystery.modifier?.key === 'blackout'}
          />
          )}

          {room.tutorial && room.status === 'active' && <TutorialCoach event={tutorialEvent} onSkip={() => setRoom(prev => (prev ? { ...prev, tutorial: false } : prev))} />}
        </div>
      </div>

      <Toasts toasts={toasts} />

      {inspectItem && (
        <EvidenceInspectorModal
          caseId={mystery.caseId}
          item={inspectItem}
          me={me}
          isPinned={pinnedRefs.has(inspectItem.id)}
          hasPartner={!!partner}
          onPin={() => placeCard('evidence', inspectItem.id)}
          onTell={() => {
            if (!pinnedRefs.has(inspectItem.id)) placeCard('evidence', inspectItem.id);
            sendPhrase('look_at', inspectItem.id);
          }}
          onClose={() => setInspectId(null)}
        />
      )}

      {caseFileOpen && (
        <CaseFileModal
          mystery={mystery}
          pinnedEvidence={mystery.evidence.filter(e => pinnedRefs.has(e.id))}
          confrontations={confrontations}
          onClose={() => {
            setCaseFileOpen(false);
            fireTutorial('caseFileClosed');
          }}
        />
      )}

      {planOpen && (
        <FloorPlanModal
          mystery={mystery}
          visibleEvidenceIds={new Set([...pinnedRefs, ...mystery.evidence.filter(e => e.role === me.role || room.mode === 'solo').map(e => e.id)])}
          searches={searches}
          active={room.status === 'active'}
          onSearch={(spotId) => socket?.emit('room:search', { spotId })}
          onClose={() => setPlanOpen(false)}
        />
      )}

      {hintsOpen && (
        <HintsModal
          hints={hints}
          used={room.hintsUsed}
          max={room.maxHints}
          active={room.status === 'active'}
          onReveal={() => socket?.emit('case:hint')}
          onClose={() => setHintsOpen(false)}
        />
      )}

      {interrogationOpen && (
        <InterrogationModal
          mystery={mystery}
          hasPartner={!!partner}
          onShareQuote={(suspectId, index) => sendPhrase('quote', suspectId, index)}
          pinnedEvidence={mystery.evidence.filter(e => pinnedRefs.has(e.id))}
          confrontations={confrontations}
          active={room.status === 'active'}
          onConfront={(suspectId, evidenceId) => socket?.emit('suspect:confront', { suspectId, evidenceId })}
          onAsk={() => fireTutorial('asked')}
          onClose={() => setInterrogationOpen(false)}
        />
      )}

      {sequence && (
        <AccusationSequence
          mystery={mystery}
          result={sequence}
          onDone={() => {
            setSequence(null);
            setAccusationOpen(true);
          }}
        />
      )}

      {accusationOpen && (
        <AccusationModal
          mystery={mystery}
          room={room}
          result={result}
          onSubmit={(submission: AccusationSubmission) => {
            socket?.emit('case:submit', { submission });
            fireTutorial('accused');
          }}
          onDismissResult={() => setResult(null)}
          onClose={() => setAccusationOpen(false)}
          onNewCase={leaveCase}
          onOpenDossier={() => setDossierOpen(true)}
        />
      )}

      {dossierOpen && result?.solution && (
        <DossierModal mystery={mystery} room={room} result={result} onClose={() => setDossierOpen(false)} />
      )}
    </div>
  );
};

export const App: React.FC = () => (
  <I18nProvider>
    <Game />
  </I18nProvider>
);

export default App;
