import { reactive, ref } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { DataLoader } from '../utils/DataLoader';
import { store as analysisStore } from './AnalysisStore';

/**
 * WhatsApp data structures: messages and daily chunks
 */
export interface WhatsAppMessage {
  date: string;        // e.g. "dd/mm/yyyy" or locale-specific
  time: string;        // e.g. "hh:mm" or "hh:mm:ss"
  author: string;
  text: string;
}

export interface WhatsAppDayChunk {
  date: string;
  messages: WhatsAppMessage[];
}

/**
 * Reactive store for imported WhatsApp chunks
 */
/**
 * List of imported WhatsApp chats, each with a name (from zip filename) and day chunks
 */
export interface ChatImport {
  name: string;
  chunks: WhatsAppDayChunk[];
}
/** Reactive store for imported WhatsApp chats */
export const chatImports = reactive<ChatImport[]>([]);

/** Currently selected chat for metadata display */
export const selectedChat = ref<ChatImport | null>(null);
/** Indicates initial processing of a selected chat (loading cached chunks) */
export const initialLoading = ref(false);

/**
 * Clear all imported chunks
 */
export function clearWhatsAppChunks(): void {
  // no-op
}

/** Add a parsed chat import to the store */
export function addChatImport(chat: ChatImport): void {
  chatImports.push(chat);
  saveImports();
}

/** Select a chat to view details */
export function setSelectedChat(chat: ChatImport): void {
  selectedChat.value = chat;
  // Reload per-chat graph and recall data
  void analysisStore.selectChat(chat.name);
}
/**
 * Remove a chat import and delete all its cached data
 */
export async function removeChatImport(chat: ChatImport): Promise<void> {
  // Delete backend cache files for this chat
  try {
    await invoke('delete_chat', { chatName: chat.name });
  } catch (e) {
    console.error('Failed to delete chat cache on backend:', e);
  }
  // Clear persisted recall progress from localStorage
  try {
    const key = `graphRecallState_${chat.name.replace(/\//g, '_')}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to clear persisted recall state:', e);
  }
  // Remove from local imports list
  const idx = chatImports.findIndex(c => c.name === chat.name);
  if (idx >= 0) chatImports.splice(idx, 1);
  // Clear selection if it was the removed chat
  if (selectedChat.value?.name === chat.name) {
    selectedChat.value = null;
  }
  // Persist updated imports list
  try {
    await saveImports();
  } catch (e) {
    console.error('Failed to save imports after removal:', e);
  }
}
/** Save current chatImports via Tauri backend */
async function saveImports() {
  try {
    await invoke('save_imports', { imports: chatImports });
  } catch (e) {
    console.error('Failed to save chat imports via backend:', e);
  }
}
/** Load persisted chatImports via Tauri backend */
async function loadImports() {
  let loaded = false;
  // Try Tauri invoke for persisted imports
  if (typeof window !== 'undefined' && typeof (window as any).__TAURI_IPC__ === 'function') {
    try {
      const imports = await invoke<ChatImport[]>('load_imports');
      if (Array.isArray(imports)) {
        chatImports.splice(0, chatImports.length, ...imports);
        loaded = true;
      }
    } catch (e) {
      console.warn('Failed to load chat imports via backend:', e);
    }
  }
  // Fallback via HTTP fetch
  if (!loaded) {
    const res = await DataLoader.loadJsonFile<unknown>('chat_imports.json');
    if (res.ok) {
      const raw = res.data;
      let importsArr: ChatImport[] = [];
      if (Array.isArray(raw)) {
        importsArr = raw as ChatImport[];
      } else if (raw && typeof raw === 'object' && 'name' in raw && 'chunks' in raw) {
        importsArr = [raw as ChatImport];
      }
      chatImports.splice(0, chatImports.length, ...importsArr);
    } else {
      console.warn('Failed to fetch chat imports via HTTP fallback:', res.error);
    }
  }
}
// Initialize store by loading persisted imports on startup
void loadImports();