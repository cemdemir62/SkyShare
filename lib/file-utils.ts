export const CHUNK_SIZE = 64 * 1024; // 64KB

export async function processFileInChunks(
  file: File,
  onChunk: (chunk: ArrayBuffer, offset: number, total: number) => void | Promise<void>
) {
  const totalSize = file.size;
  let offset = 0;

  while (offset < totalSize) {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const chunkBuffer = await slice.arrayBuffer();
    await onChunk(chunkBuffer, offset, totalSize);
    offset += chunkBuffer.byteLength;
  }
}

export function assembleFile(chunks: ArrayBuffer[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType });
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
