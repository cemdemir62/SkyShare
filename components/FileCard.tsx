import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { formatBytes } from '@/lib/file-utils';
import { motion, AnimatePresence } from 'motion/react';

interface FileCardProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function FileCard({ onFileSelect, selectedFile, disabled }: FileCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !selectedFile) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div 
      className={`glass-panel p-6 w-full max-w-md mx-auto transition-all duration-300 ${isDragging ? 'border-[var(--color-accent)] bg-[rgba(46,102,255,0.05)]' : ''} ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
          }
        }} 
        className="hidden" 
        disabled={disabled}
      />
      
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-10"
          >
            <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
              <UploadCloud size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-medium mb-2">Select a file to send</h3>
            <p className="text-sm text-gray-400 text-center px-4">
              Drag and drop your file here or click to browse. Supports files over 2GB.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="file"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-[var(--color-accent)]" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-medium truncate text-white">{selectedFile.name}</h4>
                  <p className="text-xs text-gray-400 font-mono mt-1">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              {!disabled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
                  className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <X size={18} className="text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            
            {!disabled && (
               <div className="mt-2 flex items-center text-xs text-green-400 bg-green-400/10 px-3 py-2 rounded-lg">
                 <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                 Ready to transfer
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
