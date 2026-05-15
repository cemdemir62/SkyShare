'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Download, Link, CheckCircle, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

import { usePeer } from '@/hooks/use-peer';
import { FileCard } from '@/components/FileCard';
import { Progress } from '@/components/Progress';
import { formatBytes } from '@/lib/file-utils';

type Mode = 'send' | 'receive';

export default function Home() {
  const [mode, setMode] = useState<Mode>('send');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [joinCode, setJoinCode] = useState('');
  
  const {
    peerId,
    connection,
    transferState,
    errorMessage,
    progressData,
    incomingFileInfo,
    connectToPeer,
    sendFile,
    resetTransfer,
  } = usePeer();

  // Handle Confetti
  useEffect(() => {
    if (transferState === 'completed') {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    }
  }, [transferState]);

  // Handle auto-send when connection opens in 'send' mode
  useEffect(() => {
    if (mode === 'send' && transferState === 'waiting' && selectedFile) {
      sendFile(selectedFile);
    }
  }, [mode, transferState, selectedFile, sendFile]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length === 6) {
      connectToPeer(joinCode.trim());
    }
  };

  const isTransferring = transferState === 'transferring' || transferState === 'connecting' || transferState === 'waiting';

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500 opacity-[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="mb-12 text-center">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Send className="text-white fill-white" size={20} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SkyTransfer</h1>
        </motion.div>
        <motion.p 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 max-w-md mx-auto text-sm"
        >
          Zero-server, peer-to-peer file sharing.
          Files go directly from your device to theirs.
        </motion.p>
      </header>

      {/* Main Container */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Mode Switcher */}
        {!isTransferring && transferState !== 'completed' && (
          <div className="flex bg-white/5 p-1 rounded-2xl mb-6 backdrop-blur-md border border-white/10">
            <button
              onClick={() => { setMode('send'); setSelectedFile(null); setJoinCode(''); resetTransfer(); }}
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${mode === 'send' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Send File
            </button>
            <button
              onClick={() => { setMode('receive'); setSelectedFile(null); setJoinCode(''); resetTransfer(); }}
              className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${mode === 'receive' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Receive File
            </button>
          </div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400"
          >
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{errorMessage}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'send' ? (
            <motion.div
              key="send-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col space-y-6"
            >
              {(transferState === 'idle' || transferState === 'connecting' || transferState === 'error') && (
                <FileCard onFileSelect={setSelectedFile} selectedFile={selectedFile} disabled={transferState === 'connecting'} />
              )}

              {(transferState === 'idle' || transferState === 'connecting' || transferState === 'error') && selectedFile && peerId && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-6 text-center"
                >
                  <p className="text-sm text-gray-400 uppercase tracking-widest mb-4">Your Transfer Code</p>
                  <div className="text-5xl font-mono font-bold tracking-widest mb-6 text-white text-gradient">
                    {peerId}
                  </div>
                  <div className="bg-white p-4 rounded-xl inline-block mb-6">
                    <QRCodeSVG value={peerId} size={150} level="M" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {transferState === 'connecting' ? 'Connecting to peer...' : 'Waiting for receiver to connect...'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="receive-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {(transferState === 'idle' || transferState === 'connecting' || transferState === 'error') && (
                <div className="glass-panel p-6">
                  <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-6 mx-auto">
                    <Download size={32} className="text-gray-300" />
                  </div>
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 text-center">
                        Enter Transfer Code
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="123456"
                        className="glass-input w-full p-4 text-center text-3xl font-mono tracking-[0.5em] focus:ring-0 placeholder:opacity-30"
                        disabled={transferState === 'connecting'}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={joinCode.length !== 6 || transferState === 'connecting'}
                      className="glass-button primary w-full py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {transferState === 'connecting' ? 'Connecting...' : 'Connect to Peer'}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {/* Transfer in Progress or Completed */}
          {(transferState === 'waiting' || transferState === 'transferring') && (
             <motion.div
               key="transferring"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass-panel p-6"
             >
               <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/10">
                 <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex flex-shrink-0 items-center justify-center">
                   <Link size={24} className="text-[var(--color-accent)]" />
                 </div>
                 <div className="overflow-hidden">
                   <h3 className="font-medium truncate text-white">
                     {mode === 'send' ? selectedFile?.name : incomingFileInfo?.name || 'Waiting for file info...'}
                   </h3>
                   <p className="text-xs text-gray-400 font-mono mt-1">
                     {mode === 'send' ? formatBytes(selectedFile?.size || 0) : formatBytes(incomingFileInfo?.size || 0)}
                   </p>
                 </div>
               </div>

               {progressData ? (
                 <Progress data={progressData} isReceiving={mode === 'receive'} />
               ) : (
                 <div className="flex flex-col items-center justify-center py-6">
                   <div className="w-6 h-6 border-2 border-white/20 border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
                   <p className="text-sm text-gray-400">Preparing transfer...</p>
                 </div>
               )}
             </motion.div>
          )}

          {transferState === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Transfer Complete!</h2>
              <p className="text-gray-400 text-sm mb-8">
                {mode === 'send' 
                  ? 'Your file has been successfully sent.' 
                  : 'Your file has been automatically downloaded.'}
              </p>
              
              <button
                onClick={() => {
                  resetTransfer();
                  setSelectedFile(null);
                  setJoinCode('');
                }}
                className="glass-button w-full py-3"
              >
                Send/Receive Another File
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </main>
  );
}
