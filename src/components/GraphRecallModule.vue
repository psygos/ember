<template>
  <div ref="container" class="h-full w-full flex items-center justify-center overflow-hidden relative"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import GraphRecallModuleClass from './GraphRecallModule';
import { selectedChat } from '../store/WhatsAppStore';

export default defineComponent({
  name: 'GraphRecallModule',
  setup() {
    const container = ref<HTMLElement | null>(null);
    const initModule = (chatName: string) => {
      if (!container.value) return;
      container.value.innerHTML = '';
      new GraphRecallModuleClass(container.value, chatName);
    };
    onMounted(() => {
      if (selectedChat.value) initModule(selectedChat.value.name);
      watch(selectedChat, (chat) => {
        if (chat) initModule(chat.name);
      });
    });
    return { container };
  }
});
</script>

<style scoped>
/* Recall module styles (if any) */
</style>
