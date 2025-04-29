<template>
  <div ref="container" class="h-full w-full"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { CalendarSidebar as SidebarClass } from './CalendarSidebar';

export default defineComponent({
  name: 'CalendarSidebar',
  setup() {
    const container = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (container.value) new SidebarClass(container.value);
    });
    return { container };
  }
});
</script>

<style scoped>
/* Calendar sidebar styles if needed */
</style>
