import React, { useState } from 'react';
import { ShieldAlert, Play, Plus, Key, Sliders, ChevronRight, X, UserCheck, FileSearch } from 'lucide-react';
import { Role } from '../types';

interface LobbyProps {
  onJoinRoom: (
    roomCode: string, 
    name: string, 
    role: Role, 
    seed?: string, 
    difficulty?: 'Novice' | 'Detective' | 'Mastermind', 
    theme?: 'gothic' | 'cyber' | 'opera' | 'casino' | 'express'
  ) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('lead');
  const [customSeed, setCustomSeed] = useState('');
  const [difficulty, setDifficulty] = useState<'Novice' | 'Detective' | 'Mastermind'>('Detective');
  const [theme, setTheme] = useState<'gothic' | 'cyber' | 'opera' | 'casino' | 'express'>('gothic');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCreateNew = () => {
    const name = playerName.trim() || (selectedRole === 'lead' ? 'Lead Detective' : 'Forensic Analyst');
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoinRoom(randomCode, name, selectedRole, customSeed.trim() || undefined, difficulty, theme);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    const name = playerName.trim() || (selectedRole === 'lead' ? 'Lead Detective' : 'Forensic Analyst');
    onJoinRoom(roomCodeInput.trim().toUpperCase(), name, selectedRole);
  };

  return (
    <div className="min-h-screen w-full mindplace-bg flex items-center justify-center p-6 md:p-12 lg:p-16 z-50 overflow-y-auto select-none">
      
      {/* AAA Responsive Video Game Main Menu Layout */}
      <div className="max-w-6xl w-full grid md:grid-cols-12 gap-8 lg:gap-12 items-center relative my-auto">
        
        {/* LEFT COLUMN: Fluid Game Title & Primary Actions */}
        <div className="md:col-span-6 space-y-6 lg:space-y-8 text-left">
          
          {/* Game Title Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-red-950/80 border border-red-700/60 px-3 py-1 rounded text-red-300 text-xs font-mono uppercase tracking-widest">
              <ShieldAlert size={14} className="animate-pulse text-red-400" />
              ASYMMETRIC CO-OP MIND PLACE
            </div>
            
            <h1 className="fluid-title font-black font-typewriter tracking-wide text-amber-100 drop-shadow-2xl">
              DETECTIVE<br />BOARD SYNC
            </h1>
            
            <p className="fluid-subtitle text-amber-300/70 font-courier max-w-md">
              Two investigators. Secret evidence dossiers. One shared corkboard. Connect clues to expose the killer.
            </p>
          </div>

          {/* Primary Game Menu Actions */}
          <div className="space-y-3 max-w-sm pt-2">
            <button
              onClick={handleCreateNew}
              className="game-menu-btn w-full justify-between group"
            >
              <span className="flex items-center gap-2.5">
                <Play size={18} className="fill-current text-red-200" /> NEW INVESTIGATION
              </span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="game-menu-btn-secondary w-full justify-between group"
            >
              <span className="flex items-center gap-2">
                <Plus size={16} /> JOIN ACTIVE CASE
              </span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-amber-400" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="game-menu-btn-secondary w-full justify-between group"
            >
              <span className="flex items-center gap-2">
                <Sliders size={16} /> CASE PARAMETERS ({theme.toUpperCase()})
              </span>
              <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded text-amber-400 border border-amber-800">
                {difficulty}
              </span>
            </button>
          </div>

          {/* Codename Input */}
          <div className="max-w-sm pt-2">
            <label className="block text-[10px] font-mono text-amber-400 uppercase mb-1 tracking-wider">
              INVESTIGATOR CODENAME:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Det. Miller"
              className="form-input text-xs"
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Physical Investigator ID Badges */}
        <div className="md:col-span-6 space-y-4">
          <div className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center justify-between border-b border-amber-900/40 pb-2">
            <span>SELECT INVESTIGATOR CREDENTIALS:</span>
            <span className="text-[10px] text-amber-500">ASYMMETRIC ROLE</span>
          </div>

          {/* Lead Detective ID Badge */}
          <div
            onClick={() => setSelectedRole('lead')}
            className={`id-badge ${selectedRole === 'lead' ? 'active' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-amber-900/30 pb-2 mb-2">
              <div className="flex items-center gap-2.5">
                <UserCheck size={24} className="text-amber-900" />
                <div>
                  <h3 className="font-bold font-typewriter text-base text-amber-950">LEAD DETECTIVE</h3>
                  <span className="text-[10px] font-mono text-red-800 uppercase font-bold">PLAYER 1 CREDENTIALS</span>
                </div>
              </div>
              {selectedRole === 'lead' && (
                <span className="text-xs font-mono uppercase bg-red-900 text-white px-2 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900 font-courier leading-relaxed">
              Receives witness statements, CCTV footage, phone transcripts, & suspect alibis.
            </p>
          </div>

          {/* Forensic Analyst ID Badge */}
          <div
            onClick={() => setSelectedRole('analyst')}
            className={`id-badge ${selectedRole === 'analyst' ? 'active' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-amber-900/30 pb-2 mb-2">
              <div className="flex items-center gap-2.5">
                <FileSearch size={24} className="text-blue-950" />
                <div>
                  <h3 className="font-bold font-typewriter text-base text-amber-950">FORENSIC ANALYST</h3>
                  <span className="text-[10px] font-mono text-blue-900 uppercase font-bold">PLAYER 2 CREDENTIALS</span>
                </div>
              </div>
              {selectedRole === 'analyst' && (
                <span className="text-xs font-mono uppercase bg-red-900 text-white px-2 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900 font-courier leading-relaxed">
              Receives autopsy reports, toxicology spectra, fingerprint scans, & blood spatter graphs.
            </p>
          </div>

        </div>

      </div>

      {/* Case Parameters Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md font-mono text-xs text-amber-100 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
              <span className="font-typewriter font-bold text-sm text-amber-200">CASE PARAMETERS</span>
              <button onClick={() => setIsSettingsOpen(false)} className="text-amber-400"><X size={18} /></button>
            </div>

            <div>
              <label className="block text-[10px] text-amber-400 uppercase mb-1">MYSTERY THEME:</label>
              <select
                value={theme}
                onChange={(e: any) => setTheme(e.target.value)}
                className="form-select"
              >
                <option value="gothic">Gothic Manor Poisoning</option>
                <option value="cyber">Cybertech Syndicate Homicide</option>
                <option value="opera">Victorian Opera Betrayal</option>
                <option value="casino">Noir Casino Heist Murder</option>
                <option value="express">Orient Express Carriage Mystery</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-amber-400 uppercase mb-1">DIFFICULTY TIER:</label>
              <select
                value={difficulty}
                onChange={(e: any) => setDifficulty(e.target.value)}
                className="form-select"
              >
                <option value="Novice">Novice (4 Suspects, Standard Clues)</option>
                <option value="Detective">Senior Detective (4 Suspects, Complex Clues)</option>
                <option value="Mastermind">Mastermind (5 Suspects, False Red Herrings)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-amber-400 uppercase mb-1 flex items-center gap-1">
                <Key size={10} /> CASE REPLAY SEED (OPTIONAL):
              </label>
              <input
                type="text"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value)}
                placeholder="e.g. MURDER-8841"
                className="form-input text-xs"
              />
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="tag-button w-full justify-center text-xs font-typewriter py-2"
            >
              SAVE PARAMETERS
            </button>
          </div>
        </div>
      )}

      {/* Join Case Modal */}
      {isJoinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md font-mono text-xs text-amber-100 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
              <span className="font-typewriter font-bold text-sm text-amber-200">JOIN ACTIVE INVESTIGATION</span>
              <button onClick={() => setIsJoinModalOpen(false)} className="text-amber-400"><X size={18} /></button>
            </div>

            <form onSubmit={handleJoinExisting} className="space-y-4">
              <div>
                <label className="block text-[10px] text-amber-400 uppercase mb-1">ENTER 6-DIGIT ROOM CODE:</label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="e.g. 8841X2"
                  className="form-input text-center uppercase text-sm font-bold tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="tag-button w-full justify-center text-xs font-typewriter py-2"
              >
                JOIN CASE ROOM NOW
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
