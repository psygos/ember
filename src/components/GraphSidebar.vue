<template>
  <div ref="container" class="h-full w-full"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { GraphSidebar } from './GraphSidebar';

export default defineComponent({
  name: 'GraphSidebar',
  setup() {
    const container = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (container.value) new GraphSidebar(container.value);
    });
    return { container };
  }
});
</script>

<style scoped>
/* Sidebar styling if needed */
</style>
