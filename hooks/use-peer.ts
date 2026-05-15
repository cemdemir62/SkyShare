import { useState, useEffect, useRef, useCallback } from 'react';
import type { DataConnection, Peer } from 'peerjs';

export type TransferState = 'idle' | 'waiting' | 'connecting' | 'transferring' | 'completed' | 'error';

export type ProgressData = {
  progress: number;
  speed: number;
  estimatedTime: number;
  transferredBytes: number;
  totalBytes: number;
};

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
};

export function usePeer() {
  const [peerId, setPeerId] = useState<string>('');
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [transferState, setTransferState] = useState<TransferState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [incomingFileInfo, setIncomingFileInfo] = useState<FileMetadata | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const incomingFileInfoRef = useRef<FileMetadata | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const lastBytesRef = useRef<number>(0);

  // Handle beforeunload to prevent accidental closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (transferState === 'transferring') {
        const message = "A file transfer is currently in progress. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [transferState]);

  const updateProgress = useCallback((transferred: number, total: number) => {
    const now = performance.now();
    const timeSinceLastUpdate = (now - lastUpdateRef.current) / 1000;
    
    if (timeSinceLastUpdate > 0.5 || transferred >= total) {
      const bytesSinceLast = transferred - lastBytesRef.current;
      const speed = timeSinceLastUpdate > 0 ? bytesSinceLast / timeSinceLastUpdate : 0;
      
      const remainingBytes = total - transferred;
      const estimatedTime = speed > 0 ? remainingBytes / speed : 0;
      
      setProgressData({
        progress: total > 0 ? (transferred / total) * 100 : 0,
        speed,
        estimatedTime,
        transferredBytes: transferred,
        totalBytes: total,
      });
      
      lastUpdateRef.current = now;
      lastBytesRef.current = transferred;
    }
  }, []);

  const fileStreamRef = useRef<any>(null);

  const setupConnection = useCallback((conn: DataConnection) => {
    setConnection(conn);
    setTransferState('connecting');

    conn.on('open', () => {
      setTransferState('waiting');
    });

    conn.on('data', async (data: any) => {
      if (data.type === 'metadata') {
        const metadata = {
          name: data.name,
          size: data.size,
          type: data.mimeType,
        };
        setIncomingFileInfo(metadata);
        incomingFileInfoRef.current = metadata;
        chunksRef.current = [];
        fileStreamRef.current = null;
        receivedBytesRef.current = 0;
        startTimeRef.current = performance.now();
        lastUpdateRef.current = performance.now();
        lastBytesRef.current = 0;
        
        try {
          if ('showSaveFilePicker' in window) {
             const handle = await (window as any).showSaveFilePicker({ suggestedName: metadata.name });
             fileStreamRef.current = await handle.createWritable();
          }
        } catch (err) {
          console.warn("User cancelled save prompt or File System API failed. Falling back to RAM buffer.");
        }
        
        // Let the sender know we're ready
        conn.send({ type: 'ready' });
        
        setTransferState('transferring');
      } else if (data.type === 'chunk') {
        if (fileStreamRef.current) {
           await fileStreamRef.current.write(data.chunk);
        } else {
           chunksRef.current.push(data.chunk);
        }
        receivedBytesRef.current += data.chunk.byteLength;
        
        const totalSize = incomingFileInfoRef.current?.size || 1;
        updateProgress(receivedBytesRef.current, totalSize);
      } else if (data.type === 'complete') {
        if (fileStreamRef.current) {
           await fileStreamRef.current.close();
           setTransferState('completed');
        } else {
           import('@/lib/file-utils').then(({ assembleFile }) => {
             const fileInfo = incomingFileInfoRef.current;
             const blob = assembleFile(chunksRef.current, fileInfo?.type || 'application/octet-stream');
          
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.style.display = 'none';
             a.href = url;
             a.download = fileInfo?.name || 'downloaded_file';
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             setTimeout(() => URL.revokeObjectURL(url), 1000);
             
             setTransferState('completed');
           });
        }
      }
    });

    conn.on('close', () => {
      setConnection((prev) => (prev === conn ? null : prev));
      setTransferState((prev) => {
        if (prev === 'transferring') {
            setErrorMessage('Connection closed during transfer.');
            return 'error';
        }
        return prev;
      });
    });

    conn.on('error', (err) => {
      setTransferState('error');
      setErrorMessage(err.message || 'Connection error.');
    });
  }, [updateProgress]);

  useEffect(() => {
    import('peerjs').then(({ default: Peer }) => {
      const generatedId = Math.floor(100000 + Math.random() * 900000).toString();
      const peer = new Peer(generatedId, {
        debug: 2,
        config: {
          'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peer.on('open', (id) => {
        setPeerId(id);
      });

      peer.on('connection', (conn) => {
        setupConnection(conn);
      });

      peer.on('error', (err: any) => {
        setTransferState('error');
        if (err.type === 'peer-unavailable') {
           setErrorMessage('Could not connect to peer. The code might be incorrect or the sender is offline.');
        } else {
           setErrorMessage(err.message || 'A PeerJS error occurred.');
        }
      });

      peerRef.current = peer;
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [setupConnection]);

  const connectToPeer = useCallback((targetId: string) => {
    if (!peerRef.current) return;
    setErrorMessage('');
    const conn = peerRef.current.connect(targetId, { reliable: true });
    setupConnection(conn);
  }, [setupConnection]);

  const sendFile = useCallback(async (file: File) => {
    if (!connection) {
       setErrorMessage("No connection available to send file.");
       return;
    }
    
    setTransferState('transferring');
    startTimeRef.current = performance.now();
    lastUpdateRef.current = performance.now();
    lastBytesRef.current = 0;
    
    connection.send({
      type: 'metadata',
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    });
    
    // Wait for the receiver to acknowledge metadata (e.g., file save prompt)
    await new Promise<void>((resolve) => {
      const readyListener = (data: any) => {
        if (data.type === 'ready') {
          connection.off('data', readyListener);
          resolve();
        }
      };
      connection.on('data', readyListener);
    });
    
    const { processFileInChunks } = await import('@/lib/file-utils');
    
    await processFileInChunks(file, async (chunkBuffer, offset, totalSize) => {
       connection.send({
         type: 'chunk',
         chunk: chunkBuffer,
       });
       updateProgress(offset + chunkBuffer.byteLength, totalSize);
       
       // Backpressure: wait if buffer is full
       if (connection.dataChannel && connection.dataChannel.bufferedAmount > 1024 * 1024 * 16) { // 16MB
          await new Promise<void>((resolve) => {
            const checkBuffer = () => {
              if (connection.dataChannel.bufferedAmount < 1024 * 1024 * 4) { // 4MB
                resolve();
              } else {
                setTimeout(checkBuffer, 50);
              }
            };
            checkBuffer();
          });
       }
    });
    
    connection.send({ type: 'complete' });
    setTransferState('completed');
    
  }, [connection, updateProgress]);
  
  const resetTransfer = useCallback(() => {
    setTransferState('idle');
    setProgressData(null);
    setIncomingFileInfo(null);
    setErrorMessage('');
  }, []);

  return {
    peerId,
    connection,
    transferState,
    errorMessage,
    progressData,
    incomingFileInfo,
    connectToPeer,
    sendFile,
    resetTransfer,
  };
}
