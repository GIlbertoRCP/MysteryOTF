import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Line, Circle, Path } from 'react-konva';
import Konva from 'konva';
import { isCoarsePointer, useIsPhone } from '../utils/device';

// Lets a second finger start a pinch while the first is dragging.
Konva.hitOnDragEnabled = true;
import { StickyNote, ZoomIn, ZoomOut, Maximize, Search, Spline, Trash2, X, Link2 } from 'lucide-react';
import { BoardCard, BoardStyle, CardKind, Mystery, Player, Role, Room, StatusTag, StringLabel } from '../types';
import { useI18n, TKey } from '../i18n';
import { CARD_SIZE, QUESTION_IDS, QUESTION_SIZE, QuestionId, pinPoint, questionPos } from '../boardLayout';
import { ROLE_COLORS, STRING_COLORS, initials } from '../cardInfo';
import { StringTagModal } from './StringTagModal';
import { DRAG_MIME } from './FilesPanel';
import { inviteLink } from '../App';

export interface CorkboardCanvasRef {
  exportSnapshot: () => void;
  getViewCenter: () => { x: number; y: number };
  fitToContent: () => void;
}

interface Props {
  room: Room;
  mystery: Mystery;
  me: Player;
  partner?: Player;
  solo: boolean;
  boardStyle: BoardStyle;
  partnerCursor: { x: number; y: number; name: string; role: Role } | null;
  onMoveCard: (cardId: string, x: number, y: number, final: boolean) => void;
  onDropFile: (kind: CardKind, refId: string, at: { x: number; y: number }) => void;
  onAddNote: (text: string) => void;
  onTag: (cardId: string, tag: StatusTag | null) => void;
  onRemove: (cardId: string) => void;
  onCreateString: (from: string, to: string, label: StringLabel) => void;
  onDeleteString: (stringId: string) => void;
  onInspect: (card: BoardCard) => void;
  onCursor: (x: number, y: number) => void;
  onCopied: () => void;
  /** Extra buttons for the bottom-left tool row */
  extraTools?: React.ReactNode;
  /** Dark board lit only around each player's cursor */
  flashlight?: boolean;
}

const FONT_TYPE = 'Special Elite';
const FONT_TYPED = 'Courier Prime';
const FONT_HAND = 'Permanent Marker';
const PAPER = { lead: '#efe3c6', analyst: '#e9eff0' };
const TAG_STYLE: Record<StatusTag, { color: string }> = {
  prime_suspect: { color: '#b3261e' },
  cleared: { color: '#2e7d4f' },
  key_clue: { color: '#a8741a' },
};

export const CorkboardCanvas = forwardRef<CorkboardCanvasRef, Props>((props, ref) => {
  const {
    room, mystery, me, partner, solo, boardStyle, partnerCursor, onMoveCard, onDropFile, onAddNote, onTag, onRemove,
    onCreateString, onDeleteString, onInspect, onCursor, onCopied, extraTools, flashlight,
  } = props;
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const groupRefs = useRef<Record<string, Konva.Group | null>>({});
  const knownIds = useRef<Set<string> | null>(null);
  const lastCursorSent = useRef(0);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [pendingString, setPendingString] = useState<{ from: string; to: string } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverString, setHoverString] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [fontsReady, setFontsReady] = useState(0);
  const isPhone = useIsPhone();
  const coarse = useMemo(() => isCoarsePointer(), []);
  const pinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const [light, setLight] = useState<{ x: number; y: number } | null>(null);

  const cards = room.cards;
  const cardList = useMemo(() => Object.values(cards), [cards]);

  // Redraw once the web fonts are in, otherwise Konva measures with fallbacks.
  useEffect(() => {
    document.fonts?.ready.then(() => {
      setFontsReady(n => n + 1);
      stageRef.current?.batchDraw();
    });
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Two-finger pinch zooms and pans. Native listeners so preventDefault works on every browser.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const read = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const [a, b] = [e.touches[0], e.touches[1]];
      const ax = a.clientX - rect.left, ay = a.clientY - rect.top;
      const bx = b.clientX - rect.left, by = b.clientY - rect.top;
      return { center: { x: (ax + bx) / 2, y: (ay + by) / 2 }, dist: Math.hypot(ax - bx, ay - by) };
    };
    const onMove = (e: TouchEvent) => {
      const stage = stageRef.current;
      if (e.touches.length !== 2 || !stage) return;
      e.preventDefault();
      if (stage.isDragging()) stage.stopDrag();
      const now = read(e);
      const last = pinch.current;
      pinch.current = now;
      if (!last) return;
      const oldScale = stage.scaleX();
      const world = { x: (now.center.x - stage.x()) / oldScale, y: (now.center.y - stage.y()) / oldScale };
      const next = Math.max(0.3, Math.min(2.2, oldScale * (now.dist / last.dist)));
      const nextPos = {
        x: now.center.x - world.x * next + (now.center.x - last.center.x),
        y: now.center.y - world.y * next + (now.center.y - last.center.y),
      };
      // Move the stage right away for smoothness, then sync React state.
      stage.scale({ x: next, y: next });
      stage.position(nextPos);
      setScale(next);
      setPos(nextPos);
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null;
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // ─── View helpers ───
  const toCanvas = useCallback((sx: number, sy: number) => ({ x: (sx - pos.x) / scale, y: (sy - pos.y) / scale }), [pos, scale]);

  const fitToContent = useCallback(() => {
    const boxes = [
      ...cardList.map(c => ({ x: c.x, y: c.y, w: CARD_SIZE[c.kind].w, h: CARD_SIZE[c.kind].h })),
      ...QUESTION_IDS.map(q => ({ ...questionPos(q), w: QUESTION_SIZE.w, h: QUESTION_SIZE.h })),
    ];
    const minX = Math.min(...boxes.map(b => b.x)) - 40;
    const minY = Math.min(...boxes.map(b => b.y)) - 40;
    const maxX = Math.max(...boxes.map(b => b.x + b.w)) + 40;
    const maxY = Math.max(...boxes.map(b => b.y + b.h)) + 90;
    const s = Math.max(0.35, Math.min(1.15, Math.min(size.w / (maxX - minX), size.h / (maxY - minY))));
    setScale(s);
    setPos({ x: (size.w - (maxX - minX) * s) / 2 - minX * s, y: (size.h - (maxY - minY) * s) / 2 - minY * s });
  }, [cardList, size]);

  useImperativeHandle(ref, () => ({
    exportSnapshot: () => {
      const stage = stageRef.current;
      if (!stage) return;
      const link = document.createElement('a');
      link.download = `case-${room.roomCode}.png`;
      link.href = stage.toDataURL({ pixelRatio: 2 });
      link.click();
    },
    getViewCenter: () => toCanvas(size.w / 2, size.h / 2),
    fitToContent,
  }));

  // Fit once on first layout.
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && size.w > 100) {
      didFit.current = true;
      fitToContent();
    }
  }, [size, fitToContent]);

  // Pin-drop animation for cards that appear after the first render.
  useEffect(() => {
    if (!knownIds.current) {
      knownIds.current = new Set(Object.keys(cards));
      return;
    }
    for (const id of Object.keys(cards)) {
      if (knownIds.current.has(id)) continue;
      knownIds.current.add(id);
      const node = groupRefs.current[id];
      if (!node) continue;
      node.scale({ x: 1.18, y: 1.18 });
      node.opacity(0);
      new Konva.Tween({ node, duration: 0.35, scaleX: 1, scaleY: 1, opacity: 1, easing: Konva.Easings.BackEaseOut }).play();
    }
  }, [cards]);

  // Escape cancels string mode and selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectFrom(null);
        setSelectedId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !(e.target as HTMLElement)?.closest('input,textarea')) {
        onRemove(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, onRemove]);

  const zoomBy = (factor: number, center?: { x: number; y: number }) => {
    const c = center ?? { x: size.w / 2, y: size.h / 2 };
    const next = Math.max(0.3, Math.min(2.2, scale * factor));
    const world = toCanvas(c.x, c.y);
    setScale(next);
    setPos({ x: c.x - world.x * next, y: c.y - world.y * next });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    if (e.evt.ctrlKey || e.evt.metaKey || Math.abs(e.evt.deltaY) > Math.abs(e.evt.deltaX) * 2) {
      zoomBy(e.evt.deltaY < 0 ? 1.08 : 1 / 1.08, p);
    } else {
      setPos(prev => ({ x: prev.x - e.evt.deltaX, y: prev.y - e.evt.deltaY }));
    }
  };

  const handleMouseMove = () => {
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    const world = toCanvas(p.x, p.y);
    if (connectFrom) setPointer(world);
    const now = performance.now();
    if (now - lastCursorSent.current > 60) {
      lastCursorSent.current = now;
      onCursor(world.x, world.y);
    }
  };

  const handleCardClick = (id: string) => {
    if (connectFrom) {
      if (connectFrom !== id) setPendingString({ from: connectFrom, to: id });
      setConnectFrom(null);
      return;
    }
    setSelectedId(prev => (prev === id ? null : id));
  };

  const startConnect = (id: string) => {
    setSelectedId(null);
    setConnectFrom(id);
    const start = pinPoint(cards[id], id);
    setPointer(start);
  };

  // ─── Drop from the files panel ───
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    setDropActive(false);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const world = toCanvas(e.clientX - rect.left, e.clientY - rect.top);
    const { kind, refId } = JSON.parse(raw) as { kind: CardKind; refId: string };
    onDropFile(kind, refId, world);
  };

  // ─── Lookups ───
  const evidenceById = useMemo(() => new Map(mystery.evidence.map(e => [e.id, e])), [mystery]);
  const suspectById = useMemo(() => new Map(mystery.suspects.map(s => [s.id, s])), [mystery]);
  const questionLabel: Record<QuestionId, string> = {
    'q-killer': t('board.q.killer'),
    'q-motive': t('board.q.motive'),
    'q-weapon': t('board.q.weapon'),
    'q-alibi': t('board.q.alibi'),
  };

  const highlighted = new Set<string>();
  if (hoverString && room.strings[hoverString]) {
    highlighted.add(room.strings[hoverString].fromCardId);
    highlighted.add(room.strings[hoverString].toCardId);
  }

  const selectedCard = selectedId ? cards[selectedId] : null;
  const toolbarPos = selectedCard
    ? { x: (selectedCard.x + CARD_SIZE[selectedCard.kind].w / 2) * scale + pos.x, y: selectedCard.y * scale + pos.y - 12 }
    : null;

  const bgClass = `${boardStyle}-bg`;
  const evidenceOnBoard = cardList.some(c => c.kind === 'evidence');

  // ─── Card renderers ───
  const renderSuspect = (card: BoardCard) => {
    const s = suspectById.get(card.refId);
    if (!s) return null;
    const { w, h } = CARD_SIZE.suspect;
    return (
      <>
        <Rect width={w} height={h} fill="#f7f3ea" cornerRadius={2} shadowColor="black" shadowBlur={16} shadowOpacity={0.6} shadowOffsetY={8} />
        <Rect x={12} y={12} width={w - 24} height={146} fill="#1c2129" />
        <Rect x={12} y={12} width={w - 24} height={146} fillRadialGradientStartPoint={{ x: (w - 24) / 2, y: 50 }} fillRadialGradientEndPoint={{ x: (w - 24) / 2, y: 50 }} fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={110} fillRadialGradientColorStops={[0, `${s.color}66`, 1, 'rgba(0,0,0,0)']} />
        <Circle x={w / 2} y={72} radius={27} fill="#0f1217" />
        <Path x={w / 2 - 52} y={100} data="M0 58 C 4 22, 30 8, 52 8 C 74 8, 100 22, 104 58 Z" fill="#0f1217" />
        <Text x={12} y={60} width={w - 24} align="center" text={initials(s.name)} fontFamily={FONT_TYPE} fontSize={20} fill={s.color} opacity={0.9} />
        <Text x={14} y={166} width={w - 28} text={s.name} fontFamily={FONT_HAND} fontSize={13.5} fill="#1d2a3a" wrap="word" ellipsis height={36} lineHeight={1.15} />
        <Text x={14} y={206} width={w - 28} text={s.role} fontFamily={FONT_TYPED} fontSize={11} fill="#5b4631" ellipsis wrap="none" />
      </>
    );
  };

  const renderEvidence = (card: BoardCard) => {
    const ev = evidenceById.get(card.refId);
    if (!ev) return null;
    const { w, h } = CARD_SIZE.evidence;
    const roleColor = ROLE_COLORS[ev.role];
    return (
      <>
        <Rect width={w} height={h} fill={PAPER[ev.role]} cornerRadius={2} shadowColor="black" shadowBlur={14} shadowOpacity={0.55} shadowOffsetY={7} />
        <Rect x={0} y={0} width={w} height={4} fill={roleColor} />
        <Text x={12} y={14} text={t(`kind.${ev.kind}` as TKey).toUpperCase()} fontFamily={FONT_TYPE} fontSize={10.5} letterSpacing={1.2} fill="#8a6a3d" />
        <Text x={w - 60} y={14} width={48} align="right" text={ev.role === 'lead' ? t('board.foundBy') : t('board.foundByAnalyst')} fontFamily={FONT_TYPED} fontSize={10} fill={ev.role === 'lead' ? '#9c6b12' : '#2a7896'} fontStyle="bold" />
        <Text x={12} y={32} width={w - 24} text={ev.title} fontFamily={FONT_TYPE} fontSize={13.5} lineHeight={1.15} fill="#21160c" wrap="word" ellipsis height={48} />
        <Line points={[12, 84, w - 12, 84]} stroke="#c9b48c" strokeWidth={0.75} dash={[3, 3]} />
        <Text x={12} y={92} width={w - 24} text={ev.summary} fontFamily={FONT_TYPED} fontSize={11.5} lineHeight={1.2} fill="#4a3826" wrap="word" ellipsis height={44} />
      </>
    );
  };

  const renderNote = (card: BoardCard) => {
    const { w, h } = CARD_SIZE.note;
    return (
      <>
        <Rect width={w} height={h} fill="#f6d55c" shadowColor="black" shadowBlur={10} shadowOpacity={0.5} shadowOffsetY={6} />
        <Rect width={w} height={20} fill="#ecc94b" />
        <Text x={10} y={26} width={w - 20} height={h - 32} text={card.text || ''} fontFamily={FONT_HAND} fontSize={14} lineHeight={1.15} fill="#3a2c0a" wrap="word" ellipsis />
      </>
    );
  };

  const renderTag = (card: BoardCard) => {
    if (!card.statusTag) return null;
    const { w } = CARD_SIZE[card.kind];
    const style = TAG_STYLE[card.statusTag];
    const label = t(`board.tag.${card.statusTag}` as TKey).toUpperCase();
    return (
      <Group x={w / 2} y={card.kind === 'suspect' ? 92 : 70} rotation={-12} listening={false}>
        <Rect x={-80} y={-15} width={160} height={30} stroke={style.color} strokeWidth={2.5} cornerRadius={4} fill="rgba(255,255,255,0.12)" />
        <Text x={-80} y={-8} width={160} align="center" text={label} fontFamily={FONT_TYPE} fontSize={14} letterSpacing={1.5} fill={style.color} />
      </Group>
    );
  };

  const renderPin = (id: string, x: number, active: boolean) => (
    <Group
      x={x}
      y={12}
      onMouseEnter={(e) => {
        const c = e.target.getStage()?.container();
        if (c) c.style.cursor = 'crosshair';
      }}
      onMouseLeave={(e) => {
        const c = e.target.getStage()?.container();
        if (c) c.style.cursor = '';
      }}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        if (connectFrom && connectFrom !== id) handleCardClick(id);
        else startConnect(id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        if (connectFrom && connectFrom !== id) handleCardClick(id);
        else startConnect(id);
      }}
    >
      <Circle radius={coarse ? 24 : 14} fill="transparent" />
      <Circle y={2} radius={7} fill="rgba(0,0,0,0.35)" />
      <Circle radius={active ? 9 : 7} fill="#c0392b" stroke="#7a1a12" strokeWidth={1} />
      <Circle x={-2} y={-2} radius={2.2} fill="rgba(255,255,255,0.65)" />
    </Group>
  );

  // ─── Render ───
  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${bgClass} overflow-hidden`}
      onDragOver={onDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
      onPointerMove={(e) => {
        if (!flashlight) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setLight({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      style={{ cursor: connectFrom ? 'crosshair' : undefined, touchAction: 'none' }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable
        onDragMove={(e) => {
          if (e.target === stageRef.current) setPos({ x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) setPos({ x: e.target.x(), y: e.target.y() });
        }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onTouchMove={(e) => {
          const touches = e.evt.touches;
          const stage = stageRef.current;
          if (!stage) return;
          if (touches.length === 1 && connectFrom) {
            const p = stage.getPointerPosition();
            if (p) setPointer(toCanvas(p.x, p.y));
          }
        }}
        onClick={(e) => {
          if (e.target === stageRef.current) {
            setSelectedId(null);
            setConnectFrom(null);
          }
        }}
        onTap={(e) => {
          if (e.target === stageRef.current) setSelectedId(null);
        }}
      >
        {/* Strings under the cards. Layers remount once fonts load so Konva re-measures text. */}
        <Layer key={`strings-${fontsReady}`}>
          {Object.values(room.strings).map(str => {
            const a = pinPoint(cards[str.fromCardId], str.fromCardId);
            const b = pinPoint(cards[str.toCardId], str.toCardId);
            if ((str.fromCardId.startsWith('card') || str.fromCardId.startsWith('note')) && !cards[str.fromCardId]) return null;
            if ((str.toCardId.startsWith('card') || str.toCardId.startsWith('note')) && !cards[str.toCardId]) return null;
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + Math.min(70, dist * 0.12) };
            const color = STRING_COLORS[str.label];
            const hovered = hoverString === str.id;
            const label = t(`string.${str.label}` as TKey);
            const labelW = Math.max(70, label.length * 7.2 + 20);
            return (
              <Group key={str.id} onMouseEnter={() => setHoverString(str.id)} onMouseLeave={() => setHoverString(null)}>
                <Line points={[a.x, a.y + 5, mid.x, mid.y + 7, b.x, b.y + 5]} tension={0.5} stroke="rgba(0,0,0,0.45)" strokeWidth={3} />
                <Line points={[a.x, a.y, mid.x, mid.y, b.x, b.y]} tension={0.5} stroke={color} strokeWidth={hovered ? 4 : 2.6} hitStrokeWidth={16} />
                <Group x={mid.x} y={mid.y}>
                  <Rect x={-labelW / 2} y={-11} width={labelW} height={22} cornerRadius={3} fill="#1a110a" stroke={color} strokeWidth={1} shadowColor="black" shadowBlur={6} shadowOpacity={0.6} />
                  <Text x={-labelW / 2} y={-6} width={labelW} align="center" text={label} fontFamily={FONT_TYPED} fontStyle="bold" fontSize={11.5} fill="#f6ead2" />
                  {hovered && (
                    <Group
                      x={labelW / 2 + 2}
                      y={-12}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onDeleteString(str.id);
                        setHoverString(null);
                      }}
                    >
                      <Circle radius={9} fill="#b3261e" stroke="#fff" strokeWidth={1.25} />
                      <Line points={[-3.5, -3.5, 3.5, 3.5]} stroke="#fff" strokeWidth={1.75} />
                      <Line points={[3.5, -3.5, -3.5, 3.5]} stroke="#fff" strokeWidth={1.75} />
                    </Group>
                  )}
                </Group>
              </Group>
            );
          })}
          {connectFrom && pointer && (() => {
            const a = pinPoint(cards[connectFrom], connectFrom);
            return <Line points={[a.x, a.y, pointer.x, pointer.y]} stroke="#d8432f" strokeWidth={2.5} dash={[8, 5]} listening={false} />;
          })()}
        </Layer>

        {/* Questions and cards */}
        <Layer key={`cards-${fontsReady}`}>
          {QUESTION_IDS.map((qid, i) => {
            const p = questionPos(qid);
            const isTarget = connectFrom && connectFrom !== qid;
            return (
              <Group key={qid} x={p.x} y={p.y} rotation={i % 2 ? 0.8 : -0.8} onClick={() => connectFrom && handleCardClick(qid)} onTap={() => connectFrom && handleCardClick(qid)}>
                <Rect width={QUESTION_SIZE.w} height={QUESTION_SIZE.h} fill="#fbf8f0" cornerRadius={2} shadowColor="black" shadowBlur={12} shadowOpacity={0.55} shadowOffsetY={6} stroke={isTarget ? '#d6a649' : undefined} strokeWidth={isTarget ? 3 : 0} />
                <Line points={[0, 26, QUESTION_SIZE.w, 26]} stroke="#e6a1a1" strokeWidth={1} />
                <Text x={0} y={33} width={QUESTION_SIZE.w} align="center" text={questionLabel[qid]} fontFamily={FONT_HAND} fontSize={16} fill="#b3261e" />
                {renderPin(qid, QUESTION_SIZE.w / 2, connectFrom === qid)}
              </Group>
            );
          })}

          {cardList.map(card => {
            const { w, h } = CARD_SIZE[card.kind];
            const isSelected = selectedId === card.id;
            const isSource = connectFrom === card.id;
            const isTarget = !!connectFrom && connectFrom !== card.id && hoverCard === card.id;
            const isHighlighted = highlighted.has(card.id);
            return (
              <Group
                key={card.id}
                ref={(node) => {
                  groupRefs.current[card.id] = node;
                }}
                x={card.x + w / 2}
                y={card.y + h / 2}
                offsetX={w / 2}
                offsetY={h / 2}
                rotation={card.rotation}
                opacity={card.statusTag === 'cleared' ? 0.62 : 1}
                draggable={!connectFrom}
                onDragStart={(e) => {
                  e.target.moveToTop();
                  setSelectedId(null);
                }}
                onDragMove={(e) => onMoveCard(card.id, Math.round(e.target.x() - w / 2), Math.round(e.target.y() - h / 2), false)}
                onDragEnd={(e) => onMoveCard(card.id, Math.round(e.target.x() - w / 2), Math.round(e.target.y() - h / 2), true)}
                onMouseEnter={(e) => {
                  setHoverCard(card.id);
                  const c = e.target.getStage()?.container();
                  if (c && !connectFrom) c.style.cursor = 'grab';
                }}
                onMouseLeave={(e) => {
                  setHoverCard(null);
                  const c = e.target.getStage()?.container();
                  if (c && !connectFrom) c.style.cursor = '';
                }}
                onClick={() => handleCardClick(card.id)}
                onTap={() => handleCardClick(card.id)}
                onDblClick={() => card.kind !== 'note' && onInspect(card)}
                onDblTap={() => card.kind !== 'note' && onInspect(card)}
              >
                {(isSelected || isSource || isTarget || isHighlighted) && (
                  <Rect x={-5} y={-5} width={w + 10} height={h + 10} cornerRadius={5} stroke={isTarget ? '#4caf7a' : '#d6a649'} strokeWidth={isSelected || isTarget ? 3 : 2} dash={isSource ? [6, 4] : undefined} listening={false} />
                )}
                {card.kind === 'suspect' ? renderSuspect(card) : card.kind === 'evidence' ? renderEvidence(card) : renderNote(card)}
                {renderTag(card)}
                {renderPin(card.id, w / 2, isSource)}
              </Group>
            );
          })}
        </Layer>

        {/* Partner presence */}
        {partnerCursor && partner && (
          <Layer listening={false}>
            <Group x={partnerCursor.x} y={partnerCursor.y} scaleX={1 / scale} scaleY={1 / scale}>
              <Path data="M0 0 L0 17 L4.5 13 L8 21 L11 19.5 L7.5 12 L13 12 Z" fill={ROLE_COLORS[partnerCursor.role]} stroke="#120b07" strokeWidth={1.25} />
              <Rect x={14} y={16} width={partnerCursor.name.length * 7 + 16} height={20} cornerRadius={10} fill={ROLE_COLORS[partnerCursor.role]} />
              <Text x={14} y={20.5} width={partnerCursor.name.length * 7 + 16} align="center" text={partnerCursor.name} fontFamily="Libre Franklin" fontStyle="bold" fontSize={11.5} fill="#1b1209" />
            </Group>
          </Layer>
        )}
      </Stage>

      {flashlight && (() => {
        const me = light ?? { x: size.w / 2, y: size.h / 2 };
        const holes = [`radial-gradient(circle 190px at ${me.x}px ${me.y}px, transparent 35%, black 100%)`];
        if (partnerCursor && partner) {
          holes.push(`radial-gradient(circle 150px at ${partnerCursor.x * scale + pos.x}px ${partnerCursor.y * scale + pos.y}px, transparent 30%, black 100%)`);
        }
        const mask = holes.join(', ');
        return (
          <div
            className="pointer-events-none absolute inset-0 z-[6]"
            aria-hidden
            style={{
              background: 'rgba(4,3,2,0.95)',
              WebkitMaskImage: mask,
              maskImage: mask,
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect',
            }}
          />
        );
      })()}

      {/* Waiting for partner */}
      {!partner && !solo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 sheet w-[min(560px,calc(100%-32px))] rounded-lg panel shadow-2xl px-4 py-3 flex items-center gap-4">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brass)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brass)]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[var(--text)]">{t('wait.title')}</div>
            <div className="text-[13px] text-[var(--text-dim)]">
              {t('wait.body', { code: room.roomCode })}
            </div>
          </div>
          <button
            className="btn btn-brass shrink-0"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteLink(room.roomCode));
                onCopied();
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            <Link2 size={15} /> {t('wait.copy')}
          </button>
        </div>
      )}

      {/* String mode banner */}
      {connectFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 sheet rounded-full bg-[#2a0f0b] border border-[var(--blood)] px-4 py-2 flex items-center gap-3 text-[13.5px] text-[#f6d8cf] shadow-2xl">
          <Spline size={15} className="text-[var(--blood-bright)]" />
          {t('board.connectHint')}
          <button onClick={() => setConnectFrom(null)} className="rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold bg-[var(--blood)] hover:bg-[var(--blood-bright)] text-white">
            {t('board.cancel')}
          </button>
        </div>
      )}

      {/* Toolbar for the selected card */}
      {selectedCard && toolbarPos && !connectFrom && (
        <div
          className={
            isPhone
              ? 'absolute z-20 left-2 right-2 bottom-[72px] sheet flex items-center gap-0.5 overflow-x-auto rounded-lg panel shadow-2xl p-1'
              : 'absolute z-20 -translate-x-1/2 -translate-y-full sheet flex items-center gap-0.5 rounded-lg panel shadow-2xl p-1'
          }
          style={isPhone ? undefined : { left: Math.max(150, Math.min(size.w - 150, toolbarPos.x)), top: Math.max(56, toolbarPos.y) }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {selectedCard.kind !== 'note' && (
            <ToolButton icon={<Search size={15} />} label={t('board.inspect')} onClick={() => onInspect(selectedCard)} />
          )}
          <ToolButton icon={<Spline size={15} />} label={t('board.connect')} onClick={() => startConnect(selectedCard.id)} />
          <span className="mx-1 h-5 w-px bg-[var(--line)]" />
          {(['prime_suspect', 'cleared', 'key_clue'] as StatusTag[]).map(tag => (
            <button
              key={tag}
              onClick={() => onTag(selectedCard.id, selectedCard.statusTag === tag ? null : tag)}
              className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 sm:py-1.5 text-[12.5px] font-semibold transition-colors ${
                selectedCard.statusTag === tag ? 'text-white' : 'text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
              style={selectedCard.statusTag === tag ? { background: TAG_STYLE[tag].color } : undefined}
              aria-pressed={selectedCard.statusTag === tag}
            >
              {t(`board.tag.${tag}` as TKey)}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-[var(--line)]" />
          <ToolButton
            icon={<Trash2 size={15} />}
            label={t('board.remove')}
            danger
            onClick={() => {
              onRemove(selectedCard.id);
              setSelectedId(null);
            }}
          />
          <button className="icon-btn h-8 w-8" onClick={() => setSelectedId(null)} aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Empty-board hint */}
      {!evidenceOnBoard && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 font-marker text-[22px] text-paper/45 text-center px-4">
          {isPhone ? t('board.emptyPhone') : `← ${t('board.empty')}`}
        </div>
      )}

      {dropActive && <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-brass/70" />}

      {/* Bottom-left tools */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        {noteDraft === null ? (
          <button onClick={() => setNoteDraft('')} className="btn bg-[#f6d55c] text-[#3a2c0a] hover:bg-[#fae17a] shadow-lg">
            <StickyNote size={16} /> {t('board.note')}
          </button>
        ) : (
          <form
            className="sheet flex items-center gap-2 rounded-lg bg-[#f6d55c] p-1.5 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (noteDraft.trim()) onAddNote(noteDraft.trim());
              setNoteDraft(null);
            }}
          >
            <input
              autoFocus
              value={noteDraft}
              maxLength={160}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setNoteDraft(null)}
              placeholder={t('board.notePrompt')}
              className="w-64 bg-transparent px-2 py-1 font-marker text-[15px] text-[#3a2c0a] placeholder:text-[#3a2c0a]/50 outline-none"
            />
            <button type="submit" className="btn btn-ink py-1.5">
              {t('board.note')}
            </button>
          </form>
        )}
        {extraTools}
        <div className="flex items-center rounded-lg panel shadow-lg">
          <button className="icon-btn hidden sm:inline-flex" onClick={() => zoomBy(1 / 1.2)} aria-label={t('board.zoomOut')} title={t('board.zoomOut')}>
            <ZoomOut size={16} />
          </button>
          <span className="hidden sm:inline w-11 text-center text-[12px] tabular text-[var(--text-faint)]">{Math.round(scale * 100)}%</span>
          <button className="icon-btn hidden sm:inline-flex" onClick={() => zoomBy(1.2)} aria-label={t('board.zoomIn')} title={t('board.zoomIn')}>
            <ZoomIn size={16} />
          </button>
          <button className="icon-btn" onClick={fitToContent} aria-label={t('board.fit')} title={`${t('board.fit')} (F)`}>
            <Maximize size={15} />
          </button>
        </div>
      </div>

      {pendingString && (
        <StringTagModal
          onConfirm={(label) => {
            onCreateString(pendingString.from, pendingString.to, label);
            setPendingString(null);
          }}
          onCancel={() => setPendingString(null)}
        />
      )}
    </div>
  );
});

const ToolButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-md px-2 py-2 sm:py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-white/5 ${
      danger ? 'text-[var(--blood-bright)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
    }`}
  >
    {icon}
    {label}
  </button>
);
