import React, { useState, useEffect, useRef } from 'react';
import { Radio, Send, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Role } from '../types';
import { soundFx } from '../utils/audio';

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  text: string;
  timestamp: string;
}

interface WalkieTalkieChatProps {
  messages: ChatMessage[];
  myRole: Role;
  myName: string;
  onSendMessage: (text: string) => void;
}

const QUICK_PRESETS = [
  "Check the toxicology report!",
  "Found an alibi contradiction!",
  "Pin the murder weapon evidence!",
  "Who has the CCTV log file?",
  "Ready to submit accusation!"
];

export const WalkieTalkieChat: React.FC<WalkieTalkieChatProps> = ({
  messages,
  myRole,
  myName,
  onSendMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      soundFx.playRadioChirp();
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePresetClick = (presetText: string) => {
    onSendMessage(presetText);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      
      {/* Walkie Talkie Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/90 border border-amber-700/60 hover:border-amber-400 text-amber-300 font-mono text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 transition glow-red"
      >
        <Radio size={16} className="animate-pulse text-red-500" />
        <span>RADIO COMM {messages.length > 0 && `(${messages.length})`}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 bg-black/95 border border-amber-800/60 rounded-xl p-4 mt-2 shadow-2xl backdrop-blur-md flex flex-col h-96 font-mono text-xs">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-2">
            <span className="text-amber-400 font-typewriter font-bold flex items-center gap-1.5">
              <Radio size={14} className="text-red-500" /> DISPATCH WALKIE-TALKIE
            </span>
            <span className="text-[10px] text-amber-600">CH-8492</span>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-1 overflow-x-auto pb-2 mb-2 border-b border-amber-900/20">
            {QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(preset)}
                className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300/80 hover:text-amber-100 text-[10px] px-2 py-0.5 rounded whitespace-nowrap transition"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
            {messages.length === 0 ? (
              <div className="text-center text-amber-700/60 italic text-[11px] py-10">
                Radio frequency silent. Type a message or click a preset to communicate with your partner.
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.role === myRole;

                return (
                  <div
                    key={msg.id}
                    className={`p-2 rounded border text-[11px] ${
                      isMe
                        ? 'bg-amber-950/40 border-amber-800/40 text-amber-100 ml-4'
                        : 'bg-black/60 border-green-900/40 text-green-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] text-amber-500/70 mb-0.5">
                      <span className="font-bold">
                        {msg.sender} ({msg.role === 'lead' ? 'Lead' : 'Analyst'})
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="leading-snug">{msg.text}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-amber-900/30">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Radio msg..."
              className="flex-1 bg-black/80 border border-amber-800/50 rounded px-2.5 py-1.5 text-amber-100 placeholder-amber-800 focus:outline-none focus:border-amber-400 text-xs"
            />
            <button
              type="submit"
              className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-1.5 rounded font-mono text-xs border border-amber-500/40 flex items-center justify-center"
            >
              <Send size={12} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
