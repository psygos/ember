<template>
  <div class="p-4 text-white overflow-auto">
    <div v-if="!selectedChat" class="text-gray-400">
      Select a chat to view details
    </div>
    <div v-else>
      <h3 class="text-xl font-bold mb-4">{{ selectedChat.name }}</h3>
      <ul class="space-y-2">
        <li><strong>Days:</strong> {{ dayCount }}</li>
        <li><strong>Messages:</strong> {{ messageCount }}</li>
        <li><strong>From:</strong> {{ startDate }}</li>
        <li><strong>To:</strong> {{ endDate }}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { selectedChat } from '../store/WhatsAppStore';

export default defineComponent({
  name: 'WhatsAppSidebar',
  setup() {
    const dayCount = computed(() => selectedChat.value ? selectedChat.value.chunks.length : 0);
    const messageCount = computed(() => {
      if (!selectedChat.value) return 0;
      return selectedChat.value.chunks.reduce((sum, day) => sum + day.messages.length, 0);
    });
    const startDate = computed(() => selectedChat.value && selectedChat.value.chunks.length
      ? selectedChat.value.chunks[0].date : '-');
    const endDate = computed(() => selectedChat.value && selectedChat.value.chunks.length
      ? selectedChat.value.chunks[selectedChat.value.chunks.length - 1].date : '-');
    return { selectedChat, dayCount, messageCount, startDate, endDate };
  }
});
</script>

<style scoped>
/* WhatsApp sidebar styling */
</style>