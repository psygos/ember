<template>
  <div id="app" class="flex flex-col h-full bg-black text-white">
    <header class="flex items-center justify-between px-4 py-2 border-b border-ember-orange">
      <h1 class="text-2xl font-bold text-ember-orange">ember</h1>
    <nav class="flex space-x-4 items-center">
      <!-- Chat handle / Import tab -->
      <button :class="btnClass(ViewType.Import)" @click="selectView(ViewType.Import)" title="Import Chats">
        <span v-if="!isChatSelected"><i class="fas fa-file-archive"></i></span>
        <span v-else>{{ selectedChatName }}</span>
      </button>
      <!-- Recall (game) -->
      <button :class="btnClass(ViewType.Recall)" @click="selectView(ViewType.Recall)" :disabled="!isChatSelected || isInitialLoading" title="Recall Quiz">
        <i class="fas fa-gamepad"></i>
      </button>
      <!-- Graph -->
      <button
        :class="btnClass(ViewType.Graph)"
        @click="goGraph"
        :disabled="!isChatSelected || isInitialLoading"
        title="Graph"
      >
        <i class="fas fa-project-diagram"></i>
      </button>
      <!-- Calendar -->
      <button :class="btnClass(ViewType.Calendar)" @click="selectView(ViewType.Calendar)" :disabled="!isChatSelected || isInitialLoading" title="Calendar">
        <i class="fas fa-calendar"></i>
      </button>
    </nav>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <main class="flex-7 overflow-hidden">
        <component :is="currentView" />
      </main>
      <!-- Sidebar hidden during Recall (game) mode -->
      <aside v-if="selectedView !== ViewType.Recall" class="flex-3 overflow-auto border-l border-gray-700">
        <CalendarSidebar v-if="selectedView === ViewType.Calendar" />
        <GraphSidebar v-if="selectedView === ViewType.Graph" />
        <WhatsAppSidebar v-if="selectedView === ViewType.Import" />
      </aside>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { store, ViewType } from './store/AnalysisStore';
import { selectedChat, initialLoading } from './store/WhatsAppStore';
import CalendarView from './components/CalendarView.vue';
import CalendarSidebar from './components/CalendarSidebar.vue';
import GraphViewModule from './components/GraphViewModule.vue';
import GraphRecallModule from './components/GraphRecallModule.vue';
import GraphSidebar from './components/GraphSidebar.vue';
import WhatsAppImportView from './components/WhatsAppImportView.vue';
import WhatsAppSidebar from './components/WhatsAppSidebar.vue';

export default defineComponent({
  name: 'App',
  components: { CalendarView, CalendarSidebar, GraphViewModule, GraphRecallModule, GraphSidebar, WhatsAppImportView, WhatsAppSidebar },
  setup() {
    const selectedView = computed(() => store.state.selectedView);
    const selectedChatName = computed(() => store.state.selectedChatName);
    const isChatSelected = computed(() => !!selectedChatName.value);
    const isInitialLoading = computed(() => initialLoading.value);
    const currentView = computed(() => {
      switch (store.state.selectedView) {
        case ViewType.Calendar: return CalendarView;
        case ViewType.Graph: return GraphViewModule;
        case ViewType.Recall: return GraphRecallModule;
        case ViewType.Import: return WhatsAppImportView;
      }
    });
    const selectView = (view: ViewType) => store.setSelectedView(view);
    const btnClass = (view: ViewType) => selectedView.value === view
      ? 'px-2 py-1 bg-ember-orange text-black rounded'
      : 'px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
    // Navigate to Graph view, reloading data from cache
    const goGraph = () => {
      if (!isChatSelected.value || isInitialLoading.value) return;
      store.selectChat(selectedChatName.value!);
      selectView(ViewType.Graph);
    };
    return { ViewType, selectedView, currentView, selectView, btnClass, selectedChatName, isChatSelected, isInitialLoading, goGraph };
  }
});
</script>

<style scoped>
#app { height: 100vh; }
.flex-7 { flex: 7; }
.flex-3 { flex: 3; }
.border-ember-orange { border-color: #f1502f; }
/* Disabled tab styling */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
