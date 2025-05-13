<template>
  <div class="api-key-setup-container">
    <h2>API Key Configuration Required</h2>
    <p>
      This application requires an API key (e.g., OpenAI API Key) to function properly.
      Please set it up according to the instructions in the README.md file.
    </p>
    <p>
      Typically, this involves setting an environment variable like <code>OPENAI_API_KEY</code>.
    </p>
    <p>
      Once the API key is configured, please restart the application.
    </p>
    <button @click="refreshStatus">Refresh Status</button>
    <div v-if="checking" class="loading-indicator">Checking...</div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { store } from '../store/AnalysisStore';

const checking = ref(false);

async function refreshStatus() {
  checking.value = true;
  await store.checkApiKeyStatus();
  checking.value = false;
  if (store.isApiKeyReady.value) {
    // Optional: automatically navigate away or indicate success
    alert('API key status updated. Please check if the app unlocks.');
  }
}
</script>

<style scoped>
.api-key-setup-container {
  background-color: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 500px;
  color: #333;
}

h2 {
  color: #d32f2f; /* Error-like color */
  margin-bottom: 15px;
}

p {
  margin-bottom: 10px;
  line-height: 1.6;
}

code {
  background-color: #f0f0f0;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
}

button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}

.loading-indicator {
  margin-top: 15px;
  font-style: italic;
  color: #555;
}
</style>
