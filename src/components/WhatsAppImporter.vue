<template>
  <div class="flex items-center whatsapp-importer">
    <button
      @click="openFileDialog"
      :disabled="loading"
      class="flex items-center px-3 py-1 border border-ember-orange text-ember-orange rounded font-medium transition-colors duration-200 hover:bg-ember-orange hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
      title="Import WhatsApp ZIP">
      <i class="fas fa-file-archive mr-1"></i>
      <span>Import Chat</span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept=".zip"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import JSZip from 'jszip';
import { addChatImport, WhatsAppDayChunk } from '../store/WhatsAppStore';

export default defineComponent({
  name: 'WhatsAppImporter',
  setup() {
    const loading = ref(false);
    const fileInput = ref<HTMLInputElement | null>(null);

    function openFileDialog() {
      if (loading.value) return;
      fileInput.value?.click();
    }

    async function onFileChange() {
      const files = fileInput.value?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      fileInput.value!.value = '';
      loading.value = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const txtEntry = Object.values(zip.files).find(
          f => !f.dir && f.name.toLowerCase().endsWith('.txt')
        );
        if (!txtEntry) throw new Error('No .txt file found in ZIP');
        const content = await txtEntry.async('string');
        const lines = content.split(/\r?\n/);
        // Parse lines like: [MM/DD/YY, HH:MM:SS AM] Author: message
        const map = new Map<string, { date: string; time: string; author: string; text: string }[]>();
        for (const line of lines) {
          if (!line.startsWith('[')) continue;
          const headerEnd = line.indexOf(']');
          if (headerEnd < 0) continue;
          const header = line.substring(1, headerEnd);
          const parts = header.split(', ');
          if (parts.length < 2) continue;
          const date = parts[0];
          const time = parts.slice(1).join(', ');
          const rest = line.substring(headerEnd + 2);
          const sep = rest.indexOf(': ');
          if (sep < 0) continue;
          const author = rest.substring(0, sep);
          const text = rest.substring(sep + 2);
          if (!map.has(date)) map.set(date, []);
          map.get(date)!.push({ date, time, author, text });
        }
        const chunks: WhatsAppDayChunk[] = Array.from(map.entries()).map(([date, messages]) => ({ date, messages }));
        chunks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const name = file.name.replace(/\.[^/.]+$/, '');
        addChatImport({ name, chunks });
        alert(`Chat "${name}" parsed successfully (${chunks.length} days).`);
      } catch (err: any) {
        console.error('WhatsApp import error:', err);
        alert(err?.message || 'Failed to import WhatsApp data.');
      } finally {
        loading.value = false;
      }
    }

    return { openFileDialog, onFileChange, fileInput, loading };
  }
});
</script>

<style scoped>
.whatsapp-importer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>