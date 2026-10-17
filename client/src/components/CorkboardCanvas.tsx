import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Group, Rect, Text, Line, Circle, Path } from 'react-konva';
import Konva from 'konva';
import { BoardCard, BoardString, Role } from '../types';
import { StringTagModal } from './StringTagModal';
import { StickyNote, Tag, ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';

export interface CorkboardCanvasRef {
  exportSnapshot: () => void;
}

interface CorkboardCanvasProps {
  cards: Record<string, BoardCard>;
  strings: Record<string, BoardString>;
  partnerCursor?: { socketId: string; x: number; y: number; name?: string };
  myRole: Role;
  canvasTheme?: 'corkboard' | 'blackboard' | 'blueprint' | 'mindplace';
  onCardMove: (cardId: string, x: number, y: number) => void;
  onCardStatusTag?: (cardId: string, statusTag: BoardCard['statusTag']) => void;
  onCreateString: (fromCardId: string, toCardId: string, label?: BoardString['label'], color?: string) => void;
  onDeleteString: (stringId: string) => void;
  onSelectCardDetails: (card: BoardCard) => void;
  onSendCursor: (x: number, y: number) => void;
  onAddStickyNote: (text: string) => void;
  onAutoTidyBoard?: () => void;
}

export const CorkboardCanvas = forwardRef<CorkboardCanvasRef, CorkboardCanvasProps>(({
  cards,
  strings,
  partnerCursor,
  myRole,
  canvasTheme = 'mindplace',
  onCardMove,
  onCardStatusTag,
  onCreateString,
  onDeleteString,
  onSelectCardDetails,
  onSendCursor,
  onAddStickyNote,
  onAutoTidyBoard
}, ref) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 64 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const [selectedPinCardId, setSelectedPinCardId] = useState<string | null>(null);
  const [pendingStringPair, setPendingStringPair] = useState<{ from: string; to: string } | null>(null);
  const [liveCursorPos, setLiveCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredStringId, setHoveredStringId] = useState<string | null>(null);
  const [hoveredPinCardId, setHoveredPinCardId] = useState<string | null>(null);
  const [activeMenuCardId, setActiveMenuCardId] = useState<string | null>(null);

  // Alan Wake 2 Mind Place Central Case Question Header Nodes
  const CASE_QUESTIONS: Record<string, BoardCard> = {
    'q-killer': {
      id: 'q-killer',
      evidenceId: 'q-killer',
      title: 'WHO IS THE KILLER?',
      type: 'witness_statement',
      role: 'lead',
      x: 80,
      y: 30,
      rotation: 0,
      placedBy: 'MindPlace',
      placedAt: 0,
      details: 'Connect prime suspect cards to expose the perpetrator.'
    },
    'q-motive': {
      id: 'q-motive',
      evidenceId: 'q-motive',
      title: 'WHAT WAS THE MOTIVE?',
      type: 'witness_statement',
      role: 'lead',
      x: 320,
      y: 30,
      rotation: 0,
      placedBy: 'MindPlace',
      placedAt: 0,
      details: 'Connect financial ledgers or blackmail evidence.'
    },
    'q-weapon': {
      id: 'q-weapon',
      evidenceId: 'q-weapon',
      title: 'WHERE IS THE MURDER WEAPON?',
      type: 'autopsy',
      role: 'analyst',
      x: 560,
      y: 30,
      rotation: 0,
      placedBy: 'MindPlace',
      placedAt: 0,
      details: 'Connect toxicology or lab specimen scans.'
    },
    'q-alibi': {
      id: 'q-alibi',
      evidenceId: 'q-alibi',
      title: 'WHAT DISPROVES THE ALIBI?',
      type: 'cctv_report',
      role: 'lead',
      x: 800,
      y: 30,
      rotation: 0,
      placedBy: 'MindPlace',
      placedAt: 0,
      details: 'Connect CCTV or telecom contradiction records.'
    }
  };

  const allCards = { ...CASE_QUESTIONS, ...cards };

  useImperativeHandle(ref, () => ({
    exportSnapshot: () => {
      if (!stageRef.current) return;
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `mindplace-caseboard-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => {
    setStageScale((prev) => Math.min(2.5, prev * 1.15));
  };

  const handleZoomOut = () => {
    setStageScale((prev) => Math.max(0.4, prev / 1.15));
  };

  const handleResetZoom = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.4, Math.min(2.5, newScale));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (pointer) {
      const canvasX = (pointer.x - stagePos.x) / stageScale;
      const canvasY = (pointer.y - stagePos.y) / stageScale;
      setLiveCursorPos({ x: canvasX, y: canvasY });
      onSendCursor(canvasX, canvasY);
    }
  };

  const handlePinClick = (cardId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;

    if (!selectedPinCardId) {
      setSelectedPinCardId(cardId);
    } else if (selectedPinCardId === cardId) {
      setSelectedPinCardId(null);
    } else {
      setPendingStringPair({ from: selectedPinCardId, to: cardId });
      setSelectedPinCardId(null);
    }
  };

  const getPinCoords = (card: BoardCard) => {
    const cardWidth = 210;
    return {
      x: card.x + cardWidth / 2,
      y: card.y + 12
    };
  };

  const activeStartCard = selectedPinCardId ? allCards[selectedPinCardId] : null;
  const startPinCoords = activeStartCard ? getPinCoords(activeStartCard) : null;

  const activeHoveredString = hoveredStringId ? strings[hoveredStringId] : null;
  const highlightedCardIds = activeHoveredString
    ? [activeHoveredString.fromCardId, activeHoveredString.toCardId]
    : [];

  const bgClass =
    canvasTheme === 'blueprint'
      ? 'blueprint-bg'
      : canvasTheme === 'blackboard'
      ? 'blackboard-bg'
      : canvasTheme === 'corkboard'
      ? 'corkboard-bg'
      : 'mindplace-bg';

  const handlePromptSticky = () => {
    const text = prompt("Enter Case Note:", "Is the witness statement verified?");
    if (text && text.trim()) {
      onAddStickyNote(text.trim());
    }
  };

  // Render Procedural Noir Illustration Vector Art inside Polaroid
  const renderNoirArtwork = (card: BoardCard) => {
    const photoWidth = 182;
    const photoHeight = 140;
    const isSuspect = card.title.toLowerCase().includes('suspect') || card.title.toLowerCase().includes('statement') || card.title.toLowerCase().includes('alibi') || card.title.toLowerCase().includes('dr.') || card.title.toLowerCase().includes('julian') || card.title.toLowerCase().includes('clara') || card.title.toLowerCase().includes('marcus') || card.title.toLowerCase().includes('genevieve') || card.title.toLowerCase().includes('garrison');

    if (isSuspect) {
      // Noir Character Silhouette Art
      return (
        <Group x={14} y={28}>
          {/* Photo Background */}
          <Rect width={photoWidth} height={photoHeight} fill="#1a2332" />
          
          {/* Character Head & Shoulders Silhouette */}
          <Circle x={91} y={55} radius={28} fill="#0d131d" />
          <Path
            data="M45 130 C 45 90, 137 90, 137 130 Z"
            fill="#0d131d"
          />

          {/* Character Accessory / Glasses / Collar / Fedor */}
          {card.title.includes('Reed') || card.title.includes('Doctor') ? (
            // Doctor Spectacles & Stethoscope
            <Group>
              <Circle x={78} y={52} radius={7} stroke="#e5a93c" strokeWidth={2} />
              <Circle x={104} y={52} radius={7} stroke="#e5a93c" strokeWidth={2} />
              <Line points={[85, 52, 97, 52]} stroke="#e5a93c" strokeWidth={2} />
            </Group>
          ) : card.title.includes('Thorne') || card.title.includes('Nephew') ? (
            // Trenchcoat Collar
            <Path data="M 70 85 L 91 110 L 112 85" stroke="#e5a93c" strokeWidth={2} />
          ) : (
            // Classic Noir Badge Silhouette
            <Circle x={91} y={55} radius={6} fill="#e5a93c" opacity={0.6} />
          )}

          {/* Photo Film Grain Tint */}
          <Rect width={photoWidth} height={photoHeight} fill="rgba(229, 169, 60, 0.05)" />
        </Group>
      );
    } else {
      // Evidence Artifact Graphic Art (Poison, Dagger, CCTV, Print)
      const isToxic = card.type === 'toxicology' || card.title.toLowerCase().includes('poison') || card.title.toLowerCase().includes('decanter');
      const isWeapon = card.type === 'autopsy' || card.title.toLowerCase().includes('weapon') || card.title.toLowerCase().includes('dagger');
      const isCctv = card.type === 'cctv_report' || card.title.toLowerCase().includes('cctv') || card.title.toLowerCase().includes('video');

      return (
        <Group x={14} y={28}>
          <Rect width={photoWidth} height={photoHeight} fill="#111823" />

          {isToxic ? (
            // Chemical Flask Artifact
            <Group x={66} y={30}>
              <Path data="M 25 10 L 35 10 L 35 30 L 50 75 L 10 75 L 25 30 Z" fill="#2d3748" stroke="#e5a93c" strokeWidth={2} />
              <Circle x={30} y={58} radius={12} fill="#e74c3c" opacity={0.8} />
            </Group>
          ) : isWeapon ? (
            // Stiletto Dagger Artifact
            <Group x={55} y={25}>
              <Path data="M 40 10 L 45 70 L 35 70 Z" fill="#e5a93c" />
              <Rect x={30} y={70} width={20} height={6} fill="#c0392b" />
              <Rect x={37} y={76} width={6} height={20} fill="#1a202c" />
            </Group>
          ) : isCctv ? (
            // CCTV Lens Artifact
            <Group x={60} y={35}>
              <Rect x={10} y={20} width={50} height={35} fill="#2d3748" stroke="#e5a93c" strokeWidth={2} cornerRadius={4} />
              <Circle x={35} y={37} radius={12} fill="#1a202c" stroke="#e74c3c" strokeWidth={2} />
              <Circle x={52} y={26} radius={3} fill="#e74c3c" />
            </Group>
          ) : (
            // Fingerprint Scan Artifact
            <Group x={60} y={30}>
              <Circle x={35} y={40} radius={30} stroke="#e5a93c" strokeWidth={1.5} dash={[6, 3]} />
              <Circle x={35} y={40} radius={20} stroke="#e5a93c" strokeWidth={1.5} />
              <Circle x={35} y={40} radius={10} stroke="#e5a93c" strokeWidth={1.5} />
            </Group>
          )}

          <Rect width={photoWidth} height={photoHeight} fill="rgba(0,0,0,0.1)" />
        </Group>
      );
    }
  };

  return (
    <div className={`relative w-full h-[calc(100vh-64px)] ${bgClass} overflow-hidden select-none`}>
      
      {/* Canvas Top Left Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button
          onClick={handlePromptSticky}
          className="tag-button bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-300 shadow-xl"
        >
          <StickyNote size={14} /> + MIND PLACE NOTE
        </button>
      </div>

      {/* Stage Navigation Control Widget (Bottom-Right) */}
      <div className="absolute bottom-20 right-6 z-30 flex flex-col gap-1.5 bg-black/90 p-1.5 rounded-lg border border-amber-800/60 shadow-2xl backdrop-blur-md">
        <button
          onClick={handleZoomIn}
          className="p-2 text-amber-300 hover:text-white hover:bg-amber-900/60 rounded transition"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2 text-amber-300 hover:text-white hover:bg-amber-900/60 rounded transition"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-2 text-amber-300 hover:text-white hover:bg-amber-900/60 rounded transition text-[10px] font-mono font-bold"
          title="Reset Zoom (1:1)"
        >
          <Maximize2 size={16} />
        </button>

        {onAutoTidyBoard && (
          <button
            onClick={onAutoTidyBoard}
            className="p-2 text-amber-300 hover:text-white hover:bg-amber-900/60 rounded transition border-t border-amber-900/40"
            title="Auto-Tidy Grid"
          >
            <Grid size={16} />
          </button>
        )}
      </div>

      {/* String Tag Modal overlay */}
      {pendingStringPair && (
        <StringTagModal
          onConfirm={(label, color) => {
            onCreateString(pendingStringPair.from, pendingStringPair.to, label, color);
            setPendingStringPair(null);
          }}
          onCancel={() => setPendingStringPair(null)}
        />
      )}

      {/* Card Status Tag Picker Overlay */}
      {activeMenuCardId && cards[activeMenuCardId] && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/95 border border-amber-600 p-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 font-mono text-xs text-amber-100">
          <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
            <Tag size={14} /> Mark Case Tag:
          </span>
          
          <button
            onClick={() => {
              onCardStatusTag?.(activeMenuCardId, 'prime_suspect');
              setActiveMenuCardId(null);
            }}
            className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500 rounded text-red-200 text-xs font-marker"
          >
            PRIME SUSPECT
          </button>

          <button
            onClick={() => {
              onCardStatusTag?.(activeMenuCardId, 'verified_innocent');
              setActiveMenuCardId(null);
            }}
            className="px-2.5 py-1 bg-green-950 hover:bg-green-900 border border-green-500 rounded text-green-200 text-xs font-marker"
          >
            VERIFIED INNOCENT
          </button>

          <button
            onClick={() => {
              onCardStatusTag?.(activeMenuCardId, 'key_clue');
              setActiveMenuCardId(null);
            }}
            className="px-2.5 py-1 bg-yellow-950 hover:bg-yellow-900 border border-yellow-500 rounded text-yellow-200 text-xs font-marker"
          >
            KEY CLUE
          </button>

          <button
            onClick={() => {
              onCardStatusTag?.(activeMenuCardId, 'unverified');
              setActiveMenuCardId(null);
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs"
          >
            CLEAR TAG
          </button>

          <button
            onClick={() => setActiveMenuCardId(null)}
            className="text-amber-500 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic String Mode Banner */}
      {selectedPinCardId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-950/90 text-red-200 border border-red-500/60 px-5 py-2 rounded-full font-mono text-xs shadow-2xl z-30 flex items-center gap-3 animate-pulse">
          <span>THREAD CONNECT MODE: Hover target pin to attach clue</span>
          <button
            onClick={() => setSelectedPinCardId(null)}
            className="bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[10px]"
          >
            CANCEL
          </button>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!selectedPinCardId}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onClick={(e) => {
          if (e.target === stageRef.current) {
            setSelectedPinCardId(null);
            setActiveMenuCardId(null);
          }
        }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
      >
        {/* Layer 1: Red Strings */}
        <Layer>
          {startPinCoords && liveCursorPos && (
            <Group>
              <Line
                points={[startPinCoords.x, startPinCoords.y, liveCursorPos.x, liveCursorPos.y]}
                stroke="#d63031"
                strokeWidth={3.5}
                dash={[6, 4]}
                shadowColor="#d63031"
                shadowBlur={10}
              />
              <Circle
                x={liveCursorPos.x}
                y={liveCursorPos.y}
                radius={7}
                fill="#d63031"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </Group>
          )}

          {Object.values(strings).map((str) => {
            const cardA = allCards[str.fromCardId];
            const cardB = allCards[str.toCardId];
            if (!cardA || !cardB) return null;

            const pinA = getPinCoords(cardA);
            const pinB = getPinCoords(cardB);

            const midX = (pinA.x + pinB.x) / 2;
            const midY = (pinA.y + pinB.y) / 2 + 25;
            const isHovered = hoveredStringId === str.id;
            const isContradiction = str.label === 'Contradiction';

            return (
              <Group
                key={str.id}
                onMouseEnter={() => setHoveredStringId(str.id)}
                onMouseLeave={() => setHoveredStringId(null)}
              >
                <Line
                  points={[pinA.x, pinA.y + 4, midX, midY + 4, pinB.x, pinB.y + 4]}
                  stroke="rgba(0, 0, 0, 0.5)"
                  strokeWidth={4}
                  tension={0.4}
                />

                <Line
                  points={[pinA.x, pinA.y, midX, midY, pinB.x, pinB.y]}
                  stroke={isHovered ? '#ff7675' : str.color || '#d63031'}
                  strokeWidth={isHovered ? 4.5 : 3}
                  tension={0.4}
                  shadowColor={isHovered ? '#ff7675' : str.color || '#d63031'}
                  shadowBlur={isHovered ? 14 : 5}
                />

                {isContradiction && (
                  <Group x={midX - 65} y={midY - 32}>
                    <Rect
                      width={130}
                      height={16}
                      fill="#d63031"
                      stroke="#ffeaa7"
                      strokeWidth={1}
                      cornerRadius={3}
                      shadowColor="red"
                      shadowBlur={8}
                    />
                    <Text
                      text="CONTRADDICTION EXPOSED!"
                      width={130}
                      align="center"
                      padding={3}
                      fill="#ffffff"
                      fontSize={8}
                      fontFamily="Special Elite"
                      fontStyle="bold"
                    />
                  </Group>
                )}

                <Group x={midX - 45} y={midY - 12}>
                  <Rect
                    width={90}
                    height={22}
                    fill={isHovered ? '#2d3436' : '#1a0f07'}
                    stroke={isHovered ? '#ff7675' : str.color || '#e5a93c'}
                    strokeWidth={isHovered ? 2 : 1}
                    cornerRadius={3}
                    shadowColor="black"
                    shadowBlur={6}
                  />
                  <Text
                    text={str.label}
                    width={90}
                    align="center"
                    padding={4}
                    fill="#fbf7ee"
                    fontSize={10}
                    fontFamily="Courier Prime"
                    fontStyle="bold"
                  />

                  {isHovered && (
                    <Group
                      x={80}
                      y={-6}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onDeleteString(str.id);
                      }}
                    >
                      <Circle radius={9} fill="#d63031" stroke="#ffffff" strokeWidth={1} />
                      <Text
                        text="✕"
                        x={-4}
                        y={-5}
                        fill="#ffffff"
                        fontSize={10}
                        fontStyle="bold"
                      />
                    </Group>
                  )}
                </Group>
              </Group>
            );
          })}
        </Layer>

        {/* Layer 2: Case Question Nodes & Authentic Alan Wake 2 Polaroid Cards */}
        <Layer>
          {/* Alan Wake 2 Mind Place Question Header Nodes */}
          {Object.values(CASE_QUESTIONS).map((qNode) => (
            <Group
              key={qNode.id}
              x={qNode.x}
              y={qNode.y}
            >
              <Rect
                width={210}
                height={55}
                fill="#1e1008"
                stroke="#e5a93c"
                strokeWidth={2}
                cornerRadius={4}
                shadowColor="black"
                shadowBlur={16}
              />
              <Text
                text={qNode.title}
                x={12}
                y={14}
                width={186}
                fontSize={11}
                fontFamily="Special Elite"
                fill="#e5a93c"
                fontStyle="bold"
                wrap="word"
              />

              {/* Pin Node */}
              <Group
                name="pinNode"
                x={105}
                y={10}
                onMouseEnter={() => setHoveredPinCardId(qNode.id)}
                onMouseLeave={() => setHoveredPinCardId(null)}
                onClick={(e) => handlePinClick(qNode.id, e)}
              >
                <Circle
                  radius={9}
                  fill="#d63031"
                  stroke="#ffffff"
                  strokeWidth={2}
                  shadowColor="black"
                  shadowBlur={6}
                />
              </Group>
            </Group>
          ))}

          {/* Authentic Alan Wake 2 Polaroid Evidence Cards */}
          {Object.values(cards).map((card) => {
            const isPinSelected = selectedPinCardId === card.id;
            const isPinHovered = hoveredPinCardId === card.id && selectedPinCardId && selectedPinCardId !== card.id;
            const isHighlightedByString = highlightedCardIds.includes(card.id);
            const isSticky = card.type === 'witness_statement' && card.title.startsWith('STICKY NOTE');
            const statusTag = card.statusTag;

            const cardWidth = 210;
            const cardHeight = 245;

            return (
              <Group
                key={card.id}
                x={card.x}
                y={card.y}
                draggable
                onDragMove={(e) => {
                  onCardMove(card.id, e.target.x(), e.target.y());
                }}
                onDragEnd={(e) => {
                  onCardMove(card.id, e.target.x(), e.target.y());
                }}
                onClick={(e) => {
                  if (e.target.name() !== 'pinNode') {
                    onSelectCardDetails(card);
                    setActiveMenuCardId(card.id);
                  }
                }}
              >
                {/* Aged Off-White Polaroid Paper Card */}
                <Rect
                  width={cardWidth}
                  height={cardHeight}
                  fill={isSticky ? '#fed330' : '#f8f5ee'}
                  stroke={
                    statusTag === 'prime_suspect' ? '#d63031' :
                    statusTag === 'verified_innocent' ? '#2ecc71' :
                    statusTag === 'key_clue' ? '#f1c40f' :
                    isHighlightedByString ? '#fdcb6e' : '#b8a686'
                  }
                  strokeWidth={statusTag || isHighlightedByString ? 3.5 : 1}
                  cornerRadius={3}
                  shadowColor="black"
                  shadowBlur={isHighlightedByString ? 25 : 18}
                  shadowOpacity={0.85}
                  shadowOffsetY={10}
                />

                {!isSticky && (
                  <>
                    {/* Metal Binder Clip Header */}
                    <Rect
                      x={95}
                      y={-8}
                      width={20}
                      height={18}
                      fill="transparent"
                      stroke="#a6b0b7"
                      strokeWidth={2.5}
                      cornerRadius={4}
                    />

                    {/* Procedural Photo Artwork */}
                    {renderNoirArtwork(card)}
                  </>
                )}

                {/* Status Tag Badge Overlay */}
                {statusTag && statusTag !== 'unverified' && (
                  <Group x={14} y={174}>
                    <Rect
                      width={182}
                      height={16}
                      fill={
                        statusTag === 'prime_suspect' ? '#d63031' :
                        statusTag === 'verified_innocent' ? '#2ecc71' : '#f1c40f'
                      }
                      cornerRadius={2}
                    />
                    <Text
                      text={
                        statusTag === 'prime_suspect' ? 'PRIME SUSPECT' :
                        statusTag === 'verified_innocent' ? 'VERIFIED INNOCENT' : 'KEY CLUE'
                      }
                      width={182}
                      align="center"
                      padding={3}
                      fill="#ffffff"
                      fontSize={9}
                      fontFamily="Special Elite"
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Handwritten Polaroid Caption */}
                <Text
                  text={card.title}
                  x={14}
                  y={isSticky ? 35 : statusTag && statusTag !== 'unverified' ? 194 : 180}
                  width={182}
                  fontSize={isSticky ? 13 : 11}
                  fontFamily={isSticky ? 'Permanent Marker' : 'Special Elite'}
                  fill="#1c2530"
                  wrap="word"
                  maxHeight={isSticky ? 180 : 55}
                />

                {/* Push Pin Node */}
                <Group
                  name="pinNode"
                  x={105}
                  y={12}
                  onMouseEnter={() => setHoveredPinCardId(card.id)}
                  onMouseLeave={() => setHoveredPinCardId(null)}
                  onClick={(e) => handlePinClick(card.id, e)}
                >
                  <Circle
                    radius={isPinSelected || isPinHovered ? 12 : 8}
                    fill={isPinHovered ? '#2ecc71' : isPinSelected ? '#e74c3c' : '#d63031'}
                    stroke={isPinHovered ? '#ffffff' : isPinSelected ? '#ffeaa7' : '#ffffff'}
                    strokeWidth={2}
                    shadowColor="black"
                    shadowBlur={isPinSelected || isPinHovered ? 10 : 4}
                  />

                  {isPinHovered && (
                    <Circle
                      radius={18}
                      stroke="#2ecc71"
                      strokeWidth={2}
                      dash={[4, 4]}
                    />
                  )}

                  {isPinSelected && (
                    <Circle
                      radius={16}
                      stroke="#ffeaa7"
                      strokeWidth={1.5}
                      dash={[4, 4]}
                    />
                  )}
                </Group>
              </Group>
            );
          })}
        </Layer>

        {/* Layer 3: Partner Cursor */}
        {partnerCursor && (
          <Layer>
            <Group x={partnerCursor.x} y={partnerCursor.y}>
              <Path
                data="M0 0 L16 16 L10 17 L16 26 L12 28 L6 19 L0 24 Z"
                fill="#2ecc71"
                stroke="#ffffff"
                strokeWidth={1.5}
                shadowColor="black"
                shadowBlur={5}
              />
              <Rect
                x={14}
                y={20}
                width={90}
                height={20}
                fill="#1e272e"
                cornerRadius={3}
                stroke="#2ecc71"
                strokeWidth={1}
              />
              <Text
                text={partnerCursor.name || 'Partner'}
                x={14}
                y={24}
                width={90}
                align="center"
                fill="#ffffff"
                fontSize={10}
                fontFamily="Inter"
              />
            </Group>
          </Layer>
        )}
      </Stage>

    </div>
  );
});
