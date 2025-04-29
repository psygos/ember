<template>
  <div
    ref="slot"
    :class="['blank-slot', assignment ? 'filled' : 'empty']"
    :style="{ width: width + 'px' }"
    @click="onClick"
  >
    <span v-if="assignment">{{ assignment }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue';

export default defineComponent({
  name: 'BlankSlot',
  props: {
    slotIndex: { type: Number, required: true },
    assignment: { type: String as () => string | null, default: null }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const slot = ref<HTMLElement | null>(null);
    const width = ref(50);

    // Measure text width to resize blank dynamically
    function measureText(text: string): number {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !slot.value) return 50;
      const style = getComputedStyle(slot.value);
      ctx.font = `${style.fontSize} ${style.fontFamily}`;
      return ctx.measureText(text).width + 20;
    }

    watch(() => props.assignment, (val) => {
      if (val) {
        width.value = measureText(val);
      } else {
        width.value = 50;
      }
    }, { immediate: true });

    onMounted(() => {
      if (props.assignment) {
        width.value = measureText(props.assignment);
      }
    });

    function onClick() {
      emit('select', props.slotIndex);
    }

    return { slot, width, onClick };
  }
});
</script>

<style scoped>
.blank-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 0 10px;
  margin: 0 2px;
  border-bottom: 2px solid white;
  cursor: pointer;
  user-select: none;
  transition: width 0.3s ease;
}
.blank-slot.filled {
  background-color: #f1502f;
  color: white;
  border-bottom: none;
  animation: pop-in 0.3s ease;
}
@keyframes pop-in {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>