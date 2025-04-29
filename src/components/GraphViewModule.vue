<template>
  <div class="relative h-full w-full">
    <div v-if="analysisStore.state.graphLoading" class="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
      <span class="text-ember-orange">Loading graph…</span>
    </div>
    <div v-else-if="analysisStore.state.graphError" class="absolute inset-0 flex items-center justify-center bg-black z-10">
      <span class="text-red-400">{{ analysisStore.state.graphError }}</span>
    </div>
    <div ref="container" class="h-full w-full"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import { GraphView } from './GraphView';
import { store as analysisStore } from '../store/AnalysisStore';

export default defineComponent({
  name: 'GraphViewModule',
  setup() {
    const container = ref<HTMLElement | null>(null);
    let gv: GraphView | null = null;
    const init = () => {
      if (gv) gv.destroy();
      if (container.value) {
        gv = new GraphView(container.value);
      }
    };
    // Initialize the graph view once the component is mounted, if data is already loaded
    onMounted(() => {
      if (analysisStore.state.selectedChatName && !analysisStore.state.graphLoading && !analysisStore.state.graphError) {
        init();
      }
    });
    // Re-initialize when the selected chat changes and graph data is ready
    watch(
      () => analysisStore.state.selectedChatName,
      (name) => {
        if (name && !analysisStore.state.graphLoading && !analysisStore.state.graphError) {
          init();
        }
      }
    );
    // Re-initialize once graph loading completes for the current chat
    watch(
      () => analysisStore.state.graphLoading,
      (loading) => {
        if (!loading && analysisStore.state.selectedChatName && !analysisStore.state.graphError) {
          init();
        }
      }
    );
    return { container, analysisStore };
  }
});
</script>

<style scoped>
/* Graph view styling */
</style>
