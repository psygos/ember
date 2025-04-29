<template>
  <div class="fill-game h-full w-full flex flex-col items-center p-4 text-white">
    <div v-if="state.loading" class="text-gray-400">Loading game...</div>
    <div v-else-if="state.error" class="flex items-center text-red-500">
      <span>{{ state.error }}</span>
      <button
        class="ml-4 px-2 py-1 bg-ember-orange text-white rounded"
        @click="retry"
      >Retry</button>
    </div>
    <div v-else class="w-full max-w-2xl">
      <h2 class="text-3xl font-bold mb-6">complete the sentences</h2>
      <!-- Sentence with blanks -->
      <div class="sentence flex flex-wrap text-lg mb-6">
        <template v-for="(seg, idx) in segments" :key="idx">
          <span v-if="seg.type === 'text'">{{ seg.text }}</span>
          <BlankSlot
            v-else
            :slotIndex="seg.index"
            :assignment="assignmentFor(seg.index)"
            @select="onSlotClick"
          />
        </template>
      </div>
      <!-- Entity bank -->
      <div class="entities flex flex-wrap gap-2 mb-6">
        <div
          v-for="entity in availableEntities"
          :key="entity.id"
          class="cursor-pointer px-3 py-1 bg-ember-orange text-white rounded"
          @click="onEntityClick(entity.id)"
        >
          {{ entity.text }}
        </div>
      </div>
      <!-- Next Round button -->
      <button
        v-if="isRoundComplete"
        class="px-4 py-2 bg-ember-orange text-white rounded"
        @click="onNextRound"
      >
        Next Round
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref } from 'vue';
import FillGameStore from '../store/FillGameStore';
import BlankSlot from './BlankSlot.vue';

interface Segment {
  type: 'text' | 'blank';
  text?: string;
  index?: number;
}

export default defineComponent({
  name: 'FillGameView',
  components: { BlankSlot },
  setup() {
    const state = FillGameStore.getState();
    const selectedSlot = ref<number | null>(null);

    onMounted(() => {
      void FillGameStore.init();
    });
    
    /**
     * Retry loading rounds on error
     */
    function retry() {
      void FillGameStore.init();
    }

    const round = computed(() =>
      state.rounds[state.currentRoundIndex] || { template: '', entities: [] }
    );

    const segments = computed<Segment[]>(() => {
      const parts = round.value.template.split('___');
      const segs: Segment[] = [];
      parts.forEach((text, i) => {
        if (text) segs.push({ type: 'text', text });
        if (i < round.value.entities.length) {
          segs.push({ type: 'blank', index: i });
        }
      });
      return segs;
    });

    const assignmentFor = (index: number) => {
      const id = state.assignments[index];
      const entity = round.value.entities.find(e => e.id === id);
      return entity ? entity.text : null;
    };

    const availableEntities = computed(() =>
      round.value.entities.filter(e => !state.assignments.includes(e.id))
    );

    function onEntityClick(entityId: string) {
      let slot = selectedSlot.value;
      if (slot === null) {
        // auto-fill first empty slot
        slot = state.assignments.findIndex(a => a === null);
      }
      if (slot !== null && slot >= 0) {
        FillGameStore.assignEntity(slot, entityId);
        selectedSlot.value = null;
      }
    }

    function onSlotClick(slotIndex: number) {
      selectedSlot.value = slotIndex;
    }

    const isRoundComplete = computed(() => FillGameStore.isRoundComplete());

    function onNextRound() {
      FillGameStore.nextRound();
      selectedSlot.value = null;
    }

    return {
      state,
      segments,
      assignmentFor,
      availableEntities,
      onEntityClick,
      onSlotClick,
      isRoundComplete,
      onNextRound,
      retry
    };
  }
});
</script>

<style scoped>
.sentence span {
  white-space: pre-wrap;
}
</style>