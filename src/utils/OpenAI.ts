import { invoke } from '@tauri-apps/api/tauri';
import type { ChatImport } from '../store/WhatsAppStore';

/**
 * Batch of day-chunks to send to OpenAI (max 10 at a time), with global start index.
 */
export interface ChatBatch {
  name: string;
  start: number;
  chunks: ChatImport['chunks'];
}

/** Send chat batch to Tauri backend for processing */
export async function processChatWithOpenAI(batch: ChatBatch): Promise<any> {
  // Rename invoke argument to match renamed cache file
  try {
    const response = await invoke('process_chat', { batch });
    return response;
  } catch (e) {
    console.error('Error calling process_chat via Tauri:', e);
    throw e;
  }
}