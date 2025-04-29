<template>
  <div ref="container" class="h-full w-full"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import CalendarView from './CalendarView';

export default defineComponent({
  name: 'CalendarView',
  setup() {
    const container = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (container.value) {
        new CalendarView(container.value);
      }
    });
    return { container };
  },
});
</script>

<style scoped>
/* Add any Calendar-specific styles here */
</style>
