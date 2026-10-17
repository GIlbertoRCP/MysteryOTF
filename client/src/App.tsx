import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState, Role, BoardCard, BoardString, EvidenceItem, AccusationSubmission } from './types';
import { Lobby } from './components/Lobby';
import { HeaderBar } from './components/HeaderBar';
import { CorkboardCanvas, CorkboardCanvasRef } from './components/CorkboardCanvas';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AccusationPanel } from './components/AccusationPanel';
import { EvidenceInspectorModal } from './components/EvidenceInspectorModal';
import { CaseSynopsisModal } from './components/CaseSynopsisModal';
import { WalkieTalkieChat, ChatMessage } from './components/WalkieTalkieChat';
import { ActivityFeed, ActivityLogItem } from './components/ActivityFeed';
import { InterrogationModal } from './components/InterrogationModal';
import { HotkeyGuide } from './components/HotkeyGuide';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myRole, setMyRole] = useState<Role>('lead');
  const [myName, setMyName] = useState<string>('');
  const [socketId, setSocketId] = useState<string>('');

  const canvasRef = useRef<CorkboardCanvasRef | null>(null);
  const [canvasTheme, setCanvasTheme] = useState<'corkboard' | 'blackboard' | 'blueprint' | 'mindplace'>('mindplace');
  const [partnerCursor, setPartnerCursor] = useState<{ socketId: string; x: number; y: number; name?: string } | undefined>(undefined);
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);
  const [isAccusationOpen, setIsAccusationOpen] = useState(false);
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const [isInterrogationOpen, setIsInterrogationOpen] = useState(false);
  const [caseResult, setCaseResult] = useState<any>(undefined);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  const addLog = (user: string, action: string) => {
    setActivityLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        user,
        action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    ]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'escape') {
        setIsSynopsisOpen(false);
        setIsInterrogationOpen(false);
        setIsAccusationOpen(false);
        setInspectItem(null);
      } else if (key === 'c') {
        setIsSynopsisOpen((prev) => !prev);
      } else if (key === 'i') {
        setIsInterrogationOpen((prev) => !prev);
      } else if (key === 't') {
        handleAutoTidyBoard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roomState]);

  useEffect(() => {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected with ID:', newSocket.id);
      setSocketId(newSocket.id || '');
    });

    newSocket.on('room:joined', ({ roomState, assignedRole, socketId }) => {
      console.log('[Socket] Joined room:', roomState.roomCode, 'Role:', assignedRole);
      setRoomState(roomState);
      setMyRole(assignedRole);
      setSocketId(socketId);
      addLog('System', `Joined case ${roomState.roomCode} as ${assignedRole}`);

      if (Object.keys(roomState.cards).length === 0) {
        roomState.mystery.suspects.forEach((suspect: any, idx: number) => {
          const cardId = `card-${suspect.id}`;
          const initialCard: BoardCard = {
            id: cardId,
            evidenceId: suspect.id,
            title: `SUSPECT: ${suspect.name}`,
            type: 'witness_statement',
            role: 'lead',
            x: 100 + (idx % 2) * 220,
            y: 80 + Math.floor(idx / 2) * 230,
            rotation: (Math.random() - 0.5) * 8,
            placedBy: 'System',
            placedAt: Date.now(),
            details: suspect.bio,
            iconType: 'user'
          };
          newSocket.emit('card:add', { roomCode: roomState.roomCode, card: initialCard });
        });
      }
    });

    newSocket.on('room:players_updated', (playersList) => {
      setRoomState((prev) => {
        if (!prev) return null;
        const newPlayers: Record<string, any> = {};
        playersList.forEach((p: any) => {
          newPlayers[p.socketId] = p;
        });
        return { ...prev, players: newPlayers };
      });
    });

    newSocket.on('card:moved', ({ cardId, x, y }) => {
      setRoomState((prev) => {
        if (!prev || !prev.cards[cardId]) return prev;
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: { ...prev.cards[cardId], x, y }
          }
        };
      });
    });

    newSocket.on('card:status_tagged', ({ cardId, statusTag }) => {
      setRoomState((prev) => {
        if (!prev || !prev.cards[cardId]) return prev;
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: { ...prev.cards[cardId], statusTag }
          }
        };
      });
      addLog('Investigator', `Tagged card as ${statusTag ? statusTag.toUpperCase() : 'CLEAR'}`);
    });

    newSocket.on('card:added', (addedCard: BoardCard) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: { ...prev.cards, [addedCard.id]: addedCard }
        };
      });
      addLog('Investigator', `Placed card "${addedCard.title}" on corkboard`);
    });

    newSocket.on('card:removed', (cardId: string) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const newCards = { ...prev.cards };
        delete newCards[cardId];
        return { ...prev, cards: newCards };
      });
    });

    newSocket.on('string:created', (newString: BoardString) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          strings: { ...prev.strings, [newString.id]: newString }
        };
      });
      addLog('Investigator', `Attached string tag "${newString.label}"`);
    });

    newSocket.on('string:deleted', (stringId: string) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const newStrings = { ...prev.strings };
        delete newStrings[stringId];
        return { ...prev, strings: newStrings };
      });
    });

    newSocket.on('presence:cursor_moved', ({ socketId, x, y }) => {
      setPartnerCursor({ socketId, x, y, name: 'Partner' });
    });

    newSocket.on('chat:received', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on('case:result', (result) => {
      setCaseResult(result);
      setIsAccusationOpen(true);
      addLog('System', `Case submission evaluated: ${result.correct ? 'SOLVED' : 'REJECTED'}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleJoinRoom = (
    roomCode: string, 
    name: string, 
    role: Role, 
    seed?: string, 
    difficulty?: 'Novice' | 'Detective' | 'Mastermind', 
    theme?: 'gothic' | 'cyber' | 'opera' | 'casino' | 'express'
  ) => {
    if (!socket) return;
    setMyName(name);
    socket.emit('room:join', { roomCode, playerName: name, role, seed, difficulty, theme });
  };

  const handleCardMove = (cardId: string, x: number, y: number) => {
    if (!socket || !roomState) return;
    setRoomState((prev) => {
      if (!prev || !prev.cards[cardId]) return prev;
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], x, y } }
      };
    });
    socket.emit('card:move', { roomCode: roomState.roomCode, cardId, x, y });
  };

  const handleCardStatusTag = (cardId: string, statusTag: BoardCard['statusTag']) => {
    if (!socket || !roomState) return;
    setRoomState((prev) => {
      if (!prev || !prev.cards[cardId]) return prev;
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], statusTag } }
      };
    });
    socket.emit('card:status_tag', { roomCode: roomState.roomCode, cardId, statusTag });
  };

  const handlePinEvidenceToBoard = (item: EvidenceItem) => {
    if (!socket || !roomState) return;
    const cardId = `card-${item.id}`;
    if (roomState.cards[cardId]) return;

    const newCard: BoardCard = {
      id: cardId,
      evidenceId: item.id,
      title: item.title,
      type: item.type,
      role: item.assignedRole,
      x: 350 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      rotation: (Math.random() - 0.5) * 10,
      placedBy: myName || myRole,
      placedAt: Date.now(),
      details: item.details,
      iconType: item.iconType
    };

    socket.emit('card:add', { roomCode: roomState.roomCode, card: newCard });
  };

  const handleAddStickyNote = (text: string) => {
    if (!socket || !roomState) return;
    const stickyId = `sticky-${Date.now()}`;

    const newStickyCard: BoardCard = {
      id: stickyId,
      evidenceId: stickyId,
      title: `STICKY NOTE: ${text}`,
      type: 'witness_statement',
      role: myRole,
      x: 400 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      rotation: (Math.random() - 0.5) * 12,
      placedBy: myName || myRole,
      placedAt: Date.now(),
      details: text,
      iconType: 'sticky-note'
    };

    socket.emit('card:add', { roomCode: roomState.roomCode, card: newStickyCard });
  };

  const handleCreateString = (fromCardId: string, toCardId: string, label?: BoardString['label'], color?: string) => {
    if (!socket || !roomState) return;

    const stringId = `str-${fromCardId}-${toCardId}`;
    const newString: BoardString = {
      id: stringId,
      fromCardId,
      toCardId,
      label: label || 'Motive',
      color: color || '#d63031',
      createdBy: socketId
    };

    socket.emit('string:create', { roomCode: roomState.roomCode, string: newString });
  };

  const handleDeleteString = (stringId: string) => {
    if (!socket || !roomState) return;
    socket.emit('string:delete', { roomCode: roomState.roomCode, stringId });
  };

  const handleAutoTidyBoard = () => {
    if (!socket || !roomState) return;
    const activeCards = Object.values(roomState.cards);
    const cols = 4;
    activeCards.forEach((card, idx) => {
      const gridX = 100 + (idx % cols) * 220;
      const gridY = 80 + Math.floor(idx / cols) * 230;
      handleCardMove(card.id, gridX, gridY);
    });
    addLog('System', 'Organized corkboard into grid layout');
  };

  const handleExportBoardImage = () => {
    if (canvasRef.current) {
      canvasRef.current.exportSnapshot();
      addLog('System', 'Exported high-res board snapshot PNG');
    }
  };

  const handleSendChatMessage = (text: string) => {
    if (!socket || !roomState) return;
    socket.emit('chat:message', {
      roomCode: roomState.roomCode,
      text,
      sender: myName || (myRole === 'lead' ? 'Lead Detective' : 'Forensic Analyst'),
      role: myRole
    });
  };

  const handleSendCursor = (x: number, y: number) => {
    if (!socket || !roomState) return;
    socket.emit('presence:cursor', { roomCode: roomState.roomCode, x, y });
  };

  const handleSubmitAccusation = (submission: AccusationSubmission) => {
    if (!socket || !roomState) return;
    socket.emit('case:submit', { roomCode: roomState.roomCode, submission });
  };

  if (!roomState) {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  const placedCardIds = Object.values(roomState.cards).map(c => c.evidenceId);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-amber-100 font-sans">
      
      {/* Header Bar */}
      <HeaderBar
        roomState={roomState}
        myRole={myRole}
        myName={myName}
        canvasTheme={canvasTheme}
        onSelectTheme={setCanvasTheme}
        onOpenAccusation={() => setIsAccusationOpen((prev) => !prev)}
        onOpenSynopsis={() => setIsSynopsisOpen((prev) => !prev)}
        onOpenInterrogation={() => setIsInterrogationOpen((prev) => !prev)}
        onAutoTidyBoard={handleAutoTidyBoard}
        onExportBoardImage={handleExportBoardImage}
      />

      {/* Shared Konva Corkboard Canvas */}
      <CorkboardCanvas
        ref={canvasRef}
        cards={roomState.cards}
        strings={roomState.strings}
        partnerCursor={partnerCursor}
        myRole={myRole}
        canvasTheme={canvasTheme}
        onCardMove={handleCardMove}
        onCardStatusTag={handleCardStatusTag}
        onCreateString={handleCreateString}
        onDeleteString={handleDeleteString}
        onSelectCardDetails={(card) => {
          const item = roomState.mystery.evidenceList.find(e => e.id === card.evidenceId);
          if (item) {
            setInspectItem(item);
          }
        }}
        onSendCursor={handleSendCursor}
        onAddStickyNote={handleAddStickyNote}
      />

      {/* Fixed Left Floating Action Button for Case Dossier */}
      <button
        onClick={() => setIsSynopsisOpen(true)}
        className="fixed top-20 left-4 z-40 bg-amber-950/90 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs font-mono px-3 py-2 rounded-lg shadow-2xl flex items-center gap-1.5 transition backdrop-blur-md"
        title="Open Case Dossier (C)"
      >
        <span className="text-base">📁</span>
        <span className="hidden sm:inline font-bold">CASE DOSSIER</span>
      </button>

      {/* Real-time Activity Feed */}
      <ActivityFeed logs={activityLogs} />

      {/* Hotkey Guide Bar */}
      <HotkeyGuide />

      {/* Private Evidence Drawer */}
      <EvidenceDrawer
        evidenceList={roomState.mystery.evidenceList}
        placedCardIds={placedCardIds}
        myRole={myRole}
        onPinToBoard={handlePinEvidenceToBoard}
        onInspectItem={(item) => setInspectItem(item)}
        onOpenCaseFile={() => setIsSynopsisOpen(true)}
      />

      {/* Walkie Talkie Chat */}
      <WalkieTalkieChat
        messages={chatMessages}
        myRole={myRole}
        myName={myName}
        onSendMessage={handleSendChatMessage}
      />

      {/* Modals */}
      {inspectItem && (
        <EvidenceInspectorModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onPin={handlePinEvidenceToBoard}
          isPinned={placedCardIds.includes(inspectItem.id)}
        />
      )}

      {isSynopsisOpen && (
        <CaseSynopsisModal
          mystery={roomState.mystery}
          evidenceList={roomState.mystery.evidenceList}
          placedCardIds={placedCardIds}
          onClose={() => setIsSynopsisOpen(false)}
        />
      )}

      {isInterrogationOpen && roomState && (
        <InterrogationModal
          mystery={roomState.mystery}
          onClose={() => setIsInterrogationOpen(false)}
        />
      )}

      {isAccusationOpen && (
        <AccusationPanel
          mystery={roomState.mystery}
          evidenceList={roomState.mystery.evidenceList}
          myRole={myRole}
          onClose={() => setIsAccusationOpen(false)}
          onSubmitAccusation={handleSubmitAccusation}
          result={caseResult}
        />
      )}

    </div>
  );
};

export default App;
