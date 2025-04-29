/* ------------------------------------------------------------------
 *  GraphRecallModule.ts – fully rewritten, self-contained controller
 *  for the graph-recall mini-game.
 * ------------------------------------------------------------------ */

import { store, ViewType } from '../store/AnalysisStore';
import { invoke } from '@tauri-apps/api/tauri';
import { selectedChat } from '../store/WhatsAppStore';
import type { WhatsAppDayChunk } from '../store/WhatsAppStore';
import { debug } from '../config';

/* ------------------------------------------------------------------ *
 *  Types
 * ------------------------------------------------------------------ */

/** One fill-in-the-blank round extracted from a chat "scene". */
export interface FillRoundData {
  id: string;                                 // unique round ID
  template: string;                           // memory sentence with "___"
  entities: { id: string; text: string }[];  // ordered blanks
  date: string;                              // date of the chunk (YYYY-MM-DD)
}

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */

/**
 * Flatten an array of chunk data into playable rounds.
 * Each element represents one processed chunk JSON with optional scenes array.
 */
/**
 * Flatten an array of chunk data into playable rounds,
 * attaching the original chunk date for saving.
 */
function flattenCache(
  entries: any[],
  chatName: string,
  chunks: WhatsAppDayChunk[]
): FillRoundData[] {
  return entries.flatMap((entry, chunkIdx) =>
    (entry.scenes ?? []).map((scene: any) => ({
      id: `${chatName}|${chunkIdx}|${scene.id}`,
      template: scene.memory,
      entities: scene.entities.map((e: any) => ({ id: e.text, text: e.text })),
      date: chunks[chunkIdx]?.date
    }))
  );
}

/* ------------------------------------------------------------------ *
 *  Main class
 * ------------------------------------------------------------------ */

export class GraphRecallModule {
  private readonly container: HTMLElement;
  private readonly chatName: string;
  private playedIds: Set<string> = new Set();
  private completedRounds = 0;
  private fetchInProgress = false;
  private fetchCycles = 0;       // count of background fetch attempts
  private lastCacheKeys = 0;     // last loaded cache key count
  private rounds: FillRoundData[] = [];
  private idx = 0;
  private revealed: boolean[] = [];
  private assignments: (string|null)[] = [];
  private loading = false;
  private error: string|null = null;
  private debugElement: HTMLElement;
  private debugConsole: HTMLElement;
  private debugLogs: string[] = [];
  private storageKey: string;

  /* ──────────────────────────────────────────────────────────────── */
  /*  Lifecycle                                                     */
  /* ──────────────────────────────────────────────────────────────── */

  constructor(container: HTMLElement, chatName: string) {
    console.log(`[GraphRecallModule] constructor for chat ${chatName}`);
    this.container = container;
    this.container.style.position = 'relative';
    this.chatName = chatName.replace(/\//g, '_');
    // Key for persisting user progress
    this.storageKey = `graphRecallState_${this.chatName}`;
    if (debug) {
      console.log(`[GraphRecallModule] constructor for chat ${chatName}`);
      this.debugLogs = [];
      this.debugConsole = document.createElement('pre');
      Object.assign(this.debugConsole.style, {
        position: 'absolute', bottom: '0px', left: '0px', margin: '0', width: '100%', height: '120px', overflowY: 'auto',
        backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '12px', zIndex: '10000', padding: '4px'
      });
      document.body.appendChild(this.debugConsole);
      this.debugElement = document.createElement('div');
      Object.assign(this.debugElement.style, {
        position: 'absolute', top: '0px', left: '0px',
        backgroundColor: 'rgba(255,255,255,0.8)', color: '#000',
        padding: '2px 6px', zIndex: '10000', cursor: 'pointer'
      });
      this.debugElement.title = 'Click to refetch';
      this.debugElement.onclick = () => { void this.backgroundFetch(); };
      document.body.appendChild(this.debugElement);
      this.updateDebug();
    }
    void this.bootstrap();
  }

  /** Load persisted progress from localStorage */
  private loadState(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.playedIds)) {
          this.playedIds = new Set(obj.playedIds);
        }
      }
    } catch (e) {
      console.warn('GraphRecallModule loadState error', e);
    }
  }

  /** Persist progress to localStorage */
  private persistState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        playedIds: Array.from(this.playedIds)
      }));
    } catch (e) {
      console.warn('GraphRecallModule persistState error', e);
    }
  }

  /** Initial load of chunk_cache.json, including graceful error UI. */
  private async bootstrap(): Promise<void> {
    this.debug(`bootstrap start for chat ${this.chatName}`);
    this.loading = true;
    this.render();
    this.updateDebug();

    try {
      // Ensure at least MIN_ROUNDS playable rounds by processing chunks as needed
      const MIN_ROUNDS = 10;
      const chat = selectedChat.value;
      if (!chat) throw new Error('No chat selected');
      // Load existing cache entries
      let json = await invoke('load_cache', { chatName: this.chatName });
      let entries = Array.isArray(json) ? (json as any[]) : [];
      this.rounds = flattenCache(entries, this.chatName, chat.chunks);
      // Process additional chunks until we have enough rounds or exhaust chat
      let processedChunks = entries.length;
      const totalChunks = chat.chunks.length;
      while (this.rounds.length < MIN_ROUNDS && processedChunks < totalChunks) {
        // Determine how many new chunks to fetch: only enough to reach MIN_ROUNDS or remaining chunks
        const missingRounds = MIN_ROUNDS - this.rounds.length;
        const batchSize = Math.min(missingRounds, totalChunks - processedChunks);
        const batchChunks = chat.chunks.slice(processedChunks, processedChunks + batchSize);
        this.debug(`bootstrap processing chunks ${processedChunks}-${processedChunks + batchChunks.length}`);
        await invoke('process_chat', { batch: { name: this.chatName, start: processedChunks, chunks: batchChunks } });
        // Reload cache entries and update rounds
        json = await invoke('load_cache', { chatName: this.chatName });
        entries = Array.isArray(json) ? (json as any[]) : [];
        processedChunks = entries.length;
        this.rounds = flattenCache(entries, this.chatName, chat.chunks);
      }
      // Load persisted progress and set up starting round
      this.loadState();
      // Filter out any stale playedIds
      const validIds = new Set(this.rounds.map(r => r.id));
      this.playedIds = new Set(Array.from(this.playedIds).filter(id => validIds.has(id)));
      this.completedRounds = this.playedIds.size;
      // Find first unplayed round index
      let nextIdx = 0;
      while (nextIdx < this.rounds.length && this.playedIds.has(this.rounds[nextIdx].id)) {
        nextIdx++;
      }
      this.idx = nextIdx;
      this.debug(`bootstrap loaded ${this.rounds.length} rounds from ${processedChunks} chunks`);
    } catch (e: any) {
      this.error = `Cache load error: ${e}`;
      this.loading = false;
      this.render();
      return;
    }

    if (!this.rounds.length) {
      this.error = 'No playable chunks found.';
      this.loading = false;
      this.render();
      return;
    }

    // idx initialized based on persisted progress
    this.revealed = Array(this.rounds[this.idx].entities.length).fill(false);
    this.resetAssignments();
    this.loading = false;
    this.error = null;
    this.updateDebug();
    this.render();
    // Prefetch next chunks at start
    void this.backgroundFetch();
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Round orchestration                                            */
  /* ──────────────────────────────────────────────────────────────── */

  private nextRound(): void {
    this.debug(`nextRound called, idx=${this.idx}, completedRounds=${this.completedRounds}`);
    const currentId = this.rounds[this.idx].id;
    this.playedIds.add(currentId);
    this.completedRounds++;
    // Persist progress after completing a round
    this.persistState();
    // Fetch next batch every 2 rounds
    if (this.completedRounds % 2 === 0) {
      this.debug(`triggering backgroundFetch after ${this.completedRounds} rounds`);
      void this.backgroundFetch();
    }
    // Move to next unplayed round
    let nextIdx = this.idx + 1;
    while (nextIdx < this.rounds.length && this.playedIds.has(this.rounds[nextIdx].id)) {
      nextIdx++;
    }
    if (nextIdx < this.rounds.length) {
      this.idx = nextIdx;
      this.revealed = Array(this.rounds[this.idx].entities.length).fill(false);
      this.resetAssignments();
      this.render();
    } else {
      store.setSelectedView(ViewType.Graph);
    }
    console.log(`[GraphRecallModule] nextRound new idx=${this.idx}, playedIds=${Array.from(this.playedIds).join(',')}`);
    this.updateDebug();
  }

  private resetAssignments(): void {
    const n = this.rounds[this.idx]?.entities.length ?? 0;
    this.assignments = Array(n).fill(null);
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Render                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  private render(): void {
    console.log(`[GraphRecallModule] render phase: ${this.revealed.some(r => !r) ? 'reveal-phase' : 'fill-phase'}`);
    console.log(`[GraphRecallModule] render: idx=${this.idx}, revealed=[${this.revealed.join(',')}]`);
    this.container.innerHTML = '';
    // Loading state: show wireframe loading bar until rounds are ready
    if (this.loading) {
      this.container.appendChild(this.loadingPane());
      return;
    }
    // Error state: display error message
    if (this.error) {
      this.container.appendChild(this.statusPane(this.error, true));
      return;
    }
    // Fill-in-the-blank phase
    this.container.appendChild(this.buildSentenceUI());
  }

  /** Build the fill-in-the-blank sentence UI */
  private buildSentenceUI(): HTMLElement {
    const { template, entities } = this.rounds[this.idx];
    console.log(`[GraphRecallModule] buildSentenceUI: template="${template}", entities.length=${entities.length}, assignments=${JSON.stringify(this.assignments)}`);

    const holder = document.createElement('div');
    holder.className =
      'flex flex-col items-center justify-center p-8 text-white text-center ' +
      'bg-black/80 rounded-lg shadow-lg space-y-6 max-w-2xl w-full ' +
      'transform transition-all duration-300';
    // Heading for the recall game
    const heading = document.createElement('h2');
    heading.textContent = 'complete the sentences';
    heading.className = 'text-3xl font-bold';
    // Light steel blue heading with upward offset and extra spacing below
    heading.style.color = 'lightsteelblue';
    heading.style.position = 'relative';
    heading.style.top = '-1.5rem';
    heading.style.marginBottom = '2rem';
    holder.appendChild(heading);
    // Round indicator
    const roundInfo = document.createElement('div');
    roundInfo.className = 'mb-4 text-sm text-gray-400';
    roundInfo.textContent = `Round ${this.completedRounds + 1}`;
    holder.appendChild(roundInfo);

    // Build sentence with blanks
    const sentenceDiv = document.createElement('div');
    sentenceDiv.className = 'text-2xl font-montserrat tracking-wide';

    const parts = template.split('___');
    parts.forEach((text, i) => {
      if (text) sentenceDiv.appendChild(document.createTextNode(text));
      if (i < entities.length) {
        const span = document.createElement('span');
        if (this.assignments[i]) {
          span.className =
            'mx-2 px-3 border-b-2 cursor-pointer transition-colors duration-200 ease-in-out ' +
            'border-ember-orange text-ember-orange';
        } else {
          span.className =
            'mx-2 px-3 border-b-2 transition-colors duration-200 ease-in-out ' +
            'border-gray-500 text-gray-200';
        }
        span.textContent = this.assignments[i] ?? '_____';
        // Make assigned blanks removable
        if (this.assignments[i]) {
          span.style.cursor = 'pointer';
          span.onclick = () => { this.assignments[i] = null; this.render(); };
        }
        sentenceDiv.appendChild(span);
      }
    });

    holder.appendChild(sentenceDiv);

    // Entity label buttons for filling blanks
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'flex flex-wrap justify-center gap-6 mt-6';
    entities.forEach((e) => {
      const btn = document.createElement('button');
      btn.textContent = e.text;
      // Determine if button should be disabled
      const blanksRemaining = this.assignments.filter(a => a === null).length;
      const isAssigned = this.assignments.includes(e.id);
      const disabled = isAssigned || blanksRemaining === 0;
      btn.disabled = disabled;
      // Wireframe-style entity button
      btn.className =
        'px-6 py-3 border border-ember-orange text-ember-orange font-semibold rounded-none bg-transparent ' +
        'transition transform duration-200 ease-in-out hover:scale-105 hover:bg-ember-orange hover:text-white ' +
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ember-orange ' +
        (disabled ? 'opacity-50 cursor-not-allowed' : '');
      btn.onclick = () => {
        const nextIdx = this.assignments.findIndex(a => a === null);
        if (nextIdx >= 0) this.assignments[nextIdx] = e.id;
        // Rerender to show next actions or remaining blanks
        this.render();
      };
      choicesDiv.appendChild(btn);
    });

    // After entity selection, show choices or action buttons
    const isComplete = this.assignments.every(a => a !== null);
    if (!isComplete) {
      holder.appendChild(choicesDiv);
    } else {
      // Show date and action buttons when round is complete
      const actionDiv = document.createElement('div');
      actionDiv.className = 'flex items-center space-x-4 mt-6';
      // Date label
      const dateLabel = document.createElement('div');
      dateLabel.textContent = `Date: ${this.rounds[this.idx].date}`;
      dateLabel.className = 'text-sm text-gray-200';
      actionDiv.appendChild(dateLabel);
      // Next button
      const btnNext = document.createElement('button');
      btnNext.textContent = 'Next';
      btnNext.className = 'px-4 py-2 bg-ember-orange text-black rounded';
      btnNext.onclick = () => { this.nextRound(); };
      actionDiv.appendChild(btnNext);
      // Save button
      const btnSave = document.createElement('button');
      btnSave.textContent = 'Save';
      btnSave.className = 'px-4 py-2 border border-ember-orange text-ember-orange rounded hover:bg-ember-orange hover:text-black';
      btnSave.onclick = () => {
        // Construct completed sentence
        const parts = template.split('___');
        let full = '';
        parts.forEach((text, i) => {
          full += text;
          if (i < this.assignments.length) full += this.assignments[i] || '';
        });
        // Save memory and go to next round
        store.saveMemory(this.rounds[this.idx].date, full);
        this.nextRound();
      };
      actionDiv.appendChild(btnSave);
      holder.appendChild(actionDiv);
    }
    return holder;
  }

  /** Loading / error view */
  private statusPane(msg: string, isError = false): HTMLElement {
    const pane = document.createElement('div');
    pane.className = 'absolute inset-0 flex items-center justify-center bg-black';
    pane.innerHTML = `<p class="text-lg ${isError ? 'text-red-400' : 'text-ember-orange'}">${msg}</p>`;
    return pane;
  }

  /** Show a transient toast message within the module */
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    // Inline styles to ensure visibility in Tauri and avoid Tailwind purging
    toast.style.position = 'fixed';
    toast.style.bottom = '8px';
    toast.style.right = '8px';
    toast.style.backgroundColor = '#f1502f';  // Ember orange
    toast.style.color = '#000';
    toast.style.padding = '4px 8px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
  }

  /** Loading pane with spinner suited to recall game */
  private loadingPane(): HTMLElement {
    const pane = document.createElement('div');
    pane.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/70 space-y-4';
    // Spinner circle
    const spinner = document.createElement('div');
    spinner.className = 'w-16 h-16 border-4 border-gray-600 border-t-4 border-ember-orange rounded-full animate-spin';
    // Loading text
    const text = document.createElement('div');
    text.textContent = 'Loading recall rounds...';
    text.className = 'text-lg text-gray-300 font-semibold';
    pane.appendChild(spinner);
    pane.appendChild(text);
    return pane;
  }

  /**
   * Background fetch of next 5 chunks of chat data.
   */
  private async backgroundFetch(): Promise<void> {
    this.fetchCycles++;
    this.debug(`backgroundFetch start, inProgress=${this.fetchInProgress}`);
    if (this.fetchInProgress) {
      this.debug('backgroundFetch aborted, already in progress');
      return;
    }
    this.fetchInProgress = true;
    this.showToast('Fetching more data…');
    this.updateDebug();
    const chat = selectedChat.value;
    if (!chat) {
      console.log('[GraphRecallModule] backgroundFetch no selectedChat');
      this.fetchInProgress = false;
      this.updateDebug();
      return;
    }
    this.debug(`chat.chunks length=${chat?.chunks.length ?? 0}`);
    const prevCount = this.rounds.length;
    try {
      // Determine next batch start from number of existing cache entries
      const entries: any[] = await invoke('load_cache', { chatName: this.chatName });
      const processed = Array.isArray(entries) ? entries.length : 0;
      this.lastCacheKeys = processed;
      this.debug(`cache entries count=${processed}`);
      const nextStart = processed;
      if (nextStart >= chat.chunks.length) {
        console.log('[GraphRecallModule] backgroundFetch no more chunks');
        this.fetchInProgress = false;
        this.updateDebug();
        return;
      }
      console.log(`[GraphRecallModule] invoking process_chat from ${nextStart}`);
      const batchChunks = chat.chunks.slice(nextStart, nextStart + 5);
      console.log(`[GraphRecallModule] batchChunks length=${batchChunks.length}`);
      await invoke('process_chat', { batch: { name: this.chatName, start: nextStart, chunks: batchChunks } });
      // Reload cache entries and update rounds list
      const updatedEntries: any[] = await invoke('load_cache', { chatName: this.chatName });
      if (Array.isArray(updatedEntries)) {
        // Update rounds with associated chunk dates
        this.rounds = flattenCache(updatedEntries, this.chatName, chat.chunks);
        const added = this.rounds.length - prevCount;
        this.debug(`fetched and added ${added}`);
        this.showToast(`Fetched ${added} new round${added > 1 ? 's' : ''}`);
        this.updateDebug();
      }
    } catch (e: any) {
      this.showToast('❌ Fetch error');
      this.debug(`backgroundFetch error: ${e}`);
    } finally {
      this.fetchInProgress = false;
      this.updateDebug();
    }
  }

  /** Update debug overlay text */
  private updateDebug(): void {
    if (!debug) return;
    this.debugElement.textContent =
      `Rounds:${this.rounds.length} Played:${this.completedRounds} ` +
      `Reveal:${this.revealed.filter(r => r).length}/${this.revealed.length} ` +
      `Fetches:${this.fetchCycles} Keys:${this.lastCacheKeys} ` +
      `Fetching:${this.fetchInProgress}`;
  }

  /** Append a message to the debug console */
  private debug(message: string): void {
    if (!debug) return;
    const ts = new Date().toLocaleTimeString();
    this.debugLogs.push(`[${ts}] ${message}`);
    if (this.debugLogs.length > 50) this.debugLogs.shift();
    this.debugConsole.textContent = this.debugLogs.join('\n');
  }
}

export default GraphRecallModule;
