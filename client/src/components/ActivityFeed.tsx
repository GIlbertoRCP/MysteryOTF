import React, { useState } from 'react';
import { Activity, ChevronRight, ChevronLeft } from 'lucide-react';

export interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  time: string;
}

interface ActivityFeedProps {
  logs: ActivityLogItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-20 right-4 z-30 flex items-start">
      
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/90 border border-amber-800/60 text-amber-300 p-2 rounded-l-lg shadow-xl hover:bg-amber-950/80 transition"
        title="Toggle Real-Time Activity Feed"
      >
        <Activity size={16} />
      </button>

      {/* Feed Panel */}
      {isOpen && (
        <div className="w-72 bg-black/95 border border-amber-800/60 rounded-r-lg rounded-bl-lg p-3 shadow-2xl backdrop-blur-md text-xs font-mono max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-1.5 mb-2">
            <span className="text-amber-400 font-typewriter font-bold flex items-center gap-1">
              <Activity size={12} /> BOARD ACTIVITY LOG
            </span>
            <span className="text-[10px] text-amber-600">LIVE</span>
          </div>

          <div className="space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-[10px] text-amber-600 italic text-center py-4">
                No recent board actions recorded.
              </div>
            ) : (
              logs.slice(-10).reverse().map((log) => (
                <div key={log.id} className="p-1.5 rounded bg-black/50 border border-amber-900/20 text-[10px] flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-bold text-amber-300">{log.user}: </span>
                    <span className="text-amber-100">{log.action}</span>
                  </div>
                  <span className="text-amber-500/60 text-[9px] ml-2">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
