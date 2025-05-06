<template>
  <div class="h-full w-full p-6 bg-ember-darkBg text-gray-200 overflow-auto font-montserrat">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Imported WhatsApp Chats</h2>
      <WhatsAppImporter />
    </div>
    <!-- Loading bar when initializing chat -->
    <div v-if="initialLoading" class="flex items-center justify-center mt-10">
      <div class="w-3/4 h-2 bg-gray-700 rounded overflow-hidden">
        <div class="h-full bg-ember-orange animate-pulse" style="width:50%"></div>
      </div>
    </div>
    <!-- Empty state -->
    <div v-else-if="chatImports.length === 0" class="text-gray-500 text-center mt-10">
      No chats imported. Use the button above to add a WhatsApp ZIP.
    </div>
    <!-- Chat list -->
    <ul v-else class="overflow-auto h-full divide-y divide-gray-700">
      <li
        v-for="chat in chatImports"
        :key="chat.name"
        @click="selectChat(chat)"
        class="flex items-center py-3 px-6 cursor-pointer text-steelblue transition-colors duration-150 hover:bg-gray-800"
      >
        <!-- Delete icon -->
        <button
          @click.stop="removeChat(chat)"
          aria-label="Delete chat"
          class="text-gray-400 hover:text-red-500 transition-colors duration-150 mr-4 text-xl"
        >
          &times;
        </button>
        <!-- Chat name -->
        <span class="flex-1 truncate text-xl font-semibold">{{ chat.name }}</span>
      </li>
    </ul>
    <!-- Error state -->
    <div v-if="error" class="text-red-500 mt-6 text-center">
      <p>{{ error }}</p>
      <button
        @click="retry"
        class="mt-3 px-3 py-1 border border-ember-orange text-ember-orange rounded text-sm transition-colors duration-150 hover:bg-ember-orange hover:text-black"
      >
        Retry
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { store } from '../store/AnalysisStore';
import { chatImports, selectedChat, initialLoading, setSelectedChat, removeChatImport } from '../store/WhatsAppStore';
import { invoke } from '@tauri-apps/api/tauri';
import WhatsAppImporter from './WhatsAppImporter.vue';

export default defineComponent({
  name: 'WhatsAppImportView',
  components: { WhatsAppImporter },
  setup() {
    // Global loading flag for initial chunk processing
    const loading = initialLoading;
    const error = ref<string | null>(null);

    async function selectChat(chat: typeof chatImports[0]) {
      setSelectedChat(chat);
      loading.value = true; // Set global loading flag
      error.value = null;
      const BATCH_SIZE = 10;
      const totalChunks = chat.chunks.length;
      // *** Limit processing to the first 20 chunks (max 2 batches) ***
      const chunksToProcess = Math.min(totalChunks, 20);

      try {
        console.log(`[WhatsAppImportView] Processing initial ${chunksToProcess} of ${totalChunks} chunks for chat: ${chat.name}`);
        // *** Loop only for the initial chunks ***
        for (let i = 0; i < chunksToProcess; i += BATCH_SIZE) {
          const start = i;
          // Calculate end index, respecting both BATCH_SIZE and chunksToProcess limit
          const end = Math.min(i + BATCH_SIZE, chunksToProcess);
          const batchChunks = chat.chunks.slice(start, end);
          // Ensure we don't send empty batches if chunksToProcess is less than BATCH_SIZE
          if (batchChunks.length === 0) continue;

          console.log(`[WhatsAppImportView] Sending initial batch ${start}-${end-1}...`);
          const batch = { name: chat.name, start: start, chunks: batchChunks };

          // Set a timeout for each individual batch processing call
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout processing batch ${start}-${end-1} after 60s`)), 60000)
          );

          await Promise.race([
            invoke('process_chat', { batch }), // Await the backend call for the current batch
            timeoutPromise
          ]);
          console.log(`[WhatsAppImportView] Initial batch ${start}-${end-1} processed.`);
        }

        console.log(`[WhatsAppImportView] Initial ${chunksToProcess} chunks processed for ${chat.name}.`);
        // *** TODO: Reload graph/analysis data later, potentially triggered by specific views (Recall, Graph) after full processing ***
        // console.log(`[WhatsAppImportView] Loading potentially partial graph data...`);
        // await store.selectChat(chat.name);
        // console.log(`[WhatsAppImportView] Partial graph data loaded for ${chat.name}.`);

      } catch (e: any) {
        console.error(`[WhatsAppImportView] Error processing chat ${chat.name}:`, e);
        error.value = e.message || String(e);
      } finally {
        loading.value = false;
      }
    }
    function retry() {
      if (selectedChat.value) selectChat(selectedChat.value);
    }
    /** Remove a chat and its cached data */
    async function removeChat(chat: typeof chatImports[0]) {
      const confirmMsg = `Delete chat "${chat.name}" and all cached data?`;
      if (!window.confirm(confirmMsg)) return;
      await removeChatImport(chat);
    }

    return {
      chatImports,
      selectedChat,
      loading,
      initialLoading,
      error,
      selectChat,
      retry,
      removeChat
    };
  }
});
</script>

<style scoped>
/* Additional styling if needed */
</style>