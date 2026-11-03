/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface SerialMonitorProps {
  lines: string[];
  onClear: () => void;
  running: boolean;
}

export const SerialMonitor: React.FC<SerialMonitorProps> = ({ lines, onClear, running }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="bg-[#111827] text-[#38BDF8] rounded-2xl border border-neutral-800 shadow-sm flex flex-col h-[320px] overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1F2937] border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <Terminal className="w-3.5 h-3.5 text-[#22C55E]" />
          <span className="font-semibold text-white">Live Field Monitor (Farmer-Friendly Stream)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${running ? 'bg-[#22C55E] animate-pulse' : 'bg-neutral-600'}`}></span>
            {running ? 'Receiving Sensor Data' : 'Idle'}
          </span>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-700/60 rounded text-[11px] transition-colors"
            title="Clear serial buffer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Log */}
      <div
        ref={containerRef}
        className="flex-1 p-3 overflow-y-auto text-xs leading-relaxed space-y-1.5 custom-scrollbar-dark select-text bg-[#0B0F19]"
      >
        {lines.length === 0 ? (
          <div className="text-neutral-500 py-8 text-center italic">
            Waiting for field sensor data... Press "Start" to begin live updates.
          </div>
        ) : (
          lines.map((line, idx) => {
            const isAlert = line.includes('ALERT') || line.includes('dry') || line.includes('High temperature') || line.includes('Low water');
            const isPumpOn = line.includes('Pump: Running') || line.includes('PUMP=ON') || line.includes('started');
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 py-0.5 border-b border-neutral-900/40 ${
                  isAlert
                    ? 'text-[#FBBF24]'
                    : isPumpOn
                    ? 'text-[#4ADE80]'
                    : 'text-[#E2E8F0]'
                }`}
              >
                <span className="text-neutral-500 font-mono text-[10px] shrink-0 pt-0.5">
                  #{String(idx + 1).padStart(3, '0')}
                </span>
                <span className="font-sans">{line}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 bg-[#1F2937]/70 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
        <span>Simplified real-time farm condition stream</span>
        <span className="font-mono text-[10px]">{lines.length} updates logged</span>
      </div>
    </div>
  );
};
