import React from 'react';
import { motion } from 'motion/react';
import { formatBytes } from '@/lib/file-utils';
import { ProgressData } from '@/hooks/use-peer';

interface ProgressProps {
  data: ProgressData;
  isReceiving?: boolean;
}

export function Progress({ data, isReceiving = false }: ProgressProps) {
  const { progress, speed, estimatedTime, transferredBytes, totalBytes } = data;
  
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full mt-6 flex flex-col space-y-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-300">
          {isReceiving ? 'Receiving...' : 'Sending...'}
        </span>
        <span className="text-2xl font-light tracking-tight text-white font-mono">
          {progress.toFixed(1)}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[var(--color-accent)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="glass-panel p-3 rounded-xl border border-white/5 !bg-white/5">
          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1">Speed</p>
          <p className="font-mono text-sm text-gray-200">{formatBytes(speed)}/s</p>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-white/5 !bg-white/5">
          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1">Time Left</p>
          <p className="font-mono text-sm text-gray-200">{formatTime(estimatedTime)}</p>
        </div>
      </div>
      
      <div className="text-center mt-2">
        <p className="font-mono text-xs text-gray-500">
          {formatBytes(transferredBytes)} / {formatBytes(totalBytes)}
        </p>
      </div>
    </div>
  );
}
