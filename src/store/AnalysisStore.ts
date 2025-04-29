import { AnalysisData } from '../models/AnalysisData';
import { GraphNode, GraphState, EntityItem } from '../models/GraphModels';
import * as THREE from 'three';
import { reactive, readonly } from 'vue';
import { format } from 'date-fns';
import ChunkSampler from '../utils/ChunkSampler';
import ProgressStore from './ProgressStore';
import { invoke } from '@tauri-apps/api/tauri';
import type { ChatImport } from './WhatsAppStore';
// Removed ChunkCacheSchema in favor of per-chunk array cache

// Swift uses an enum ViewType for view selection
export enum ViewType {
  Calendar = 'calendar',
  Graph = 'graph',
  Recall = 'recall',
  Import = 'import'
}

// Main store for application state
class AnalysisStore {
  // Swift uses an enum ViewType for view selection
  
  private _state = reactive({
    // Mapping of date (yyyy-MM-dd) to saved recall sentences
    savedMemories: {} as Record<string, string[]>,
    chats: [] as string[],
    selectedChatName: null as string | null,
    graphLoading: false,
    graphError: null as string | null,
    graphData: {} as Record<string, EntityItem[]>,
    selectedView: ViewType.Import,
    selectedDate: new Date(),
    graphState: {
      nodes: new Map<string, GraphNode>(),
      selectedNode: null as string | null,
      hoveredNode: null as string | null,
      viewOffset: new THREE.Vector2(0, 0),
      zoomLevel: 1.0,
      expandedLabels: new Set<string>(),
      game: {
        active: false,
        chunkIDs: [] as string[]
      },
      filterMode: 'full' as 'full' | 'unlockedOnly'
    } as GraphState,
  });

  // Public readonly state that components can subscribe to
  public state = readonly(this._state);

  // Initialize the store: load saved analysis and chat list
  async init() {
    await this.loadSavedAnalysis();
    await this.loadChatList();
  }

  // Load saved recall analysis via backend
  private async loadSavedAnalysis() {
    try {
      const data = await invoke<AnalysisData>('load_analysis');
      this._state.savedMemories = data.saved_memories ?? {};
      console.log('Loaded saved analysis data:', this._state.savedMemories);
    } catch (e: any) {
      console.error('Failed to load saved analysis:', e);
      this._state.savedMemories = {};
    }
  }
  /**
   * Save a completed recall sentence under the given date.
   */
  public async saveMemory(dateKey: string, memory: string): Promise<void> {
    const list = this._state.savedMemories[dateKey] || [];
    list.push(memory);
    this._state.savedMemories[dateKey] = list;
    try {
      await invoke('save_analysis', { analysis: { saved_memories: this._state.savedMemories } });
      console.log(`Saved memory for ${dateKey}:`, memory);
    } catch (e: any) {
      console.error('Failed to save analysis data:', e);
    }
  }

  // Load list of imported chat names from backend
  private async loadChatList() {
    try {
      const imports = await invoke<ChatImport[]>('load_imports');
      this._state.chats = Array.isArray(imports) ? imports.map(i => i.name) : [];
    } catch (e: any) {
      console.error('Failed to load chat list:', e);
      this._state.chats = [];
    }
  }

  // Select a chat and load its graph data
  public async selectChat(chatName: string) {
    if (this._state.selectedChatName === chatName) return;
    this._state.selectedChatName = chatName;
    this._state.graphLoading = true;
    this._state.graphError = null;
    this._state.graphData = {} as Record<string, EntityItem[]>;
    try {
      await this.loadGraphData(chatName);
    } catch (e: any) {
      console.error('Error loading graph data for', chatName, e);
      this._state.graphError = e.toString();
    } finally {
      this._state.graphLoading = false;
    }
  }

  // Load graph data from per-chat cache
  private async loadGraphData(chatName: string) {
    // Load processed chunk entries as an array
    const json = await invoke<any[]>('load_cache', { chatName });
    const entries = Array.isArray(json) ? json : [];
    const record: Record<string, EntityItem[]> = {};
    entries.forEach((entry, idx) => {
      const scenes = entry.scenes ?? [];
      const key = `${chatName}|${idx}`;
      record[key] = scenes.flatMap((scene: any) =>
        scene.entities.map((e: any) => ({ id: e.text, text: e.text, label: e.type }))
      );
    });
    this._state.graphData = record;
    this._state.graphState.nodes.clear();
    this.processGraphEntities(record);
  }

  // Process entities for graph visualization (from GraphModels.swift)
  private processGraphEntities(data: Record<string, EntityItem[]>) {
    // Radial layout parameters
    const baseRadius = 80;
    const ringSpacing = 100;
    
    const frequencies: Map<string, number> = new Map();
    const connections: Map<string, Set<string>> = new Map();
    const labels: Map<string, string> = new Map();
    
    // Process frequencies and connections
    for (const [, entities] of Object.entries(data)) {
      const filteredEntities = entities.filter(entity => 
        !entity.text.endsWith('.jpg') && 
        !entity.text.endsWith('.png') && 
        !/\d/.test(entity.text)
      );
      
      for (const entity of filteredEntities) {
        frequencies.set(entity.text, (frequencies.get(entity.text) || 0) + 1);
        labels.set(entity.text, entity.label);
      }
      
      // Create connections
      for (let i = 0; i < filteredEntities.length; i++) {
        for (let j = i + 1; j < filteredEntities.length; j++) {
          const word1 = filteredEntities[i].text;
          const word2 = filteredEntities[j].text;
          
          if (!connections.has(word1)) connections.set(word1, new Set());
          if (!connections.has(word2)) connections.set(word2, new Set());
          
          connections.get(word1)!.add(word2);
          connections.get(word2)!.add(word1);
        }
      }
    }
    
    // Sort by frequency
    const sortedWords = Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1]);
    const maxFreq = sortedWords.length > 0 ? sortedWords[0][1] : 1;
    
    // Position nodes in radial rings by frequency
    let currentRing = 0;
    let nodesPlaced = 0;
    const nodesPerRingBase = 8;
    for (const [word, freq] of sortedWords) {
      while (nodesPlaced >= nodesPerRingBase * currentRing) {
        currentRing += 1;
        nodesPlaced = 0;
      }
      const size = 15 + (freq / maxFreq * 35);
      const radius = baseRadius + currentRing * ringSpacing;
      const nodesInRing = currentRing === 0 ? 1 : nodesPerRingBase * currentRing;
      const angle = nodesInRing === 1 ? 0 : (2 * Math.PI * nodesPlaced) / nodesInRing;
      const radiusJitter = Math.random() * 10 - 5;
      const angleJitter = Math.random() * 0.2 - 0.1;
      const x = radius * Math.cos(angle + angleJitter) + radiusJitter;
      const y = radius * Math.sin(angle + angleJitter) + radiusJitter;
      this._state.graphState.nodes.set(word, {
        id: word,
        position: new THREE.Vector2(x, y),
        size: size,
        ring: currentRing,
        connections: connections.get(word) || new Set(),
        animationProgress: 1.0,
        velocity: new THREE.Vector2(0, 0),
        label: labels.get(word) || 'misc'
      });
      nodesPlaced += 1;
    }
    this.adjustForCollisions();
  }

  private adjustForCollisions() {
    // Implement collision adjustment logic here
  }
  
  // Change selected view (calendar, graph, recall)
  setSelectedView(view: ViewType) {
    this._state.selectedView = view;
    // Pause recall round when leaving recall view to decouple states
    if (view !== ViewType.Recall) {
      // Pause recall round and reset state when leaving Recall view
      this._state.graphState.game.active = false;
      // Clear any pending recall chunk IDs
      this._state.graphState.game.chunkIDs = [];
      // Restore full filter mode for connections
      this._state.graphState.filterMode = 'full';
      // Clear any node selection
      this._state.graphState.selectedNode = null;
    }
  }

  // ─── Recall Game Methods ───────────────────────────
  /**
   * Begin a recall round with optional specified chunk IDs.
   */
  public startRecallRound(ids?: string[]): void {
    const chunkIDs = ids ?? ChunkSampler.randomSlice();
    this._state.graphState.game = { active: true, chunkIDs };
    this._state.graphState.filterMode = chunkIDs.length > 0 ? 'unlockedOnly' : 'full';
  }

  public resumeActiveRound(): void {
    this._state.graphState.game.active = true;
    this._state.graphState.filterMode = this._state.graphState.game.chunkIDs.length > 0 ? 'unlockedOnly' : 'full';
  }

  public handleRecallNodeSelected(nodeId: string): void {
    const game = this._state.graphState.game;
    if (game.active && game.chunkIDs.includes(nodeId)) {
      game.chunkIDs = game.chunkIDs.filter(id => id !== nodeId);
      ProgressStore.shared.markChunkSolved([nodeId], []);
      if (game.chunkIDs.length === 0) {
        game.active = false;
        this._state.graphState.filterMode = 'full';
      }
    }
  }

  // Set selected date for calendar view
  setSelectedDate(date: Date) {
    this._state.selectedDate = date;
  }

  // Format date for the API
  getDateKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  // Select a node in the graph with smooth animation
  selectGraphNode(nodeId: string | null) {
    console.log(`Store: Selecting node ${nodeId}`);
    
    // Update selected node without centering camera
    this._state.graphState.selectedNode = nodeId;
    
    // Update animation progress for connected nodes to make them more visible
    this._state.graphState.nodes.forEach((node) => {
      if (nodeId) {
        const selectedNode = this._state.graphState.nodes.get(nodeId);
        if (selectedNode) {
          // Increase animation for the selected node and its connections
          if (node.id === nodeId) {
            node.animationProgress = 1.0;
          } else if (selectedNode.connections.has(node.id)) {
            // Gradually increase animation for connected nodes - more immediate
            node.animationProgress = Math.min(1.0, node.animationProgress + 0.5);
          } else {
            // Fade out unconnected nodes - more immediate
            node.animationProgress = Math.max(0.2, node.animationProgress - 0.5);
          }
        }
      } else {
        // Reset animation state if no node is selected
        const targetProgress = node.ring === 0 ? 0.8 : Math.max(0.2, Math.exp(-node.ring * 0.25));
        node.animationProgress = targetProgress;
      }
    });
    
    // Do NOT center the view on the selected node - maintain current view position
    // This matches Swift which does not reposition the view on selection
    console.log(`Node selection changed to ${nodeId}, maintaining view position`);
    
    // Important: Swift does NOT reposition view when selecting nodes
    // The only view changes happen from explicit gestures (pan/zoom)
  }

  // Set the hovered node
  setHoveredNode(nodeId: string | null) {
    this._state.graphState.hoveredNode = nodeId;
  }

  // Toggle category expansion in the sidebar
  toggleLabelExpansion(label: string) {
    if (this._state.graphState.expandedLabels.has(label)) {
      this._state.graphState.expandedLabels.delete(label);
    } else {
      this._state.graphState.expandedLabels.add(label);
    }
  }

  // Update graph zoom level with bounds to match Swift implementation
  setZoomLevel(level: number) {
    // Clamp zoom level to same range as Swift (0.15...4.0)
    this._state.graphState.zoomLevel = Math.max(0.15, Math.min(4.0, level));
  }

  // Update graph view offset
  setViewOffset(offset: THREE.Vector2) {
    this._state.graphState.viewOffset = offset;
  }

  // Reset graph view
  resetGraphView() {
    this._state.graphState.zoomLevel = 1.0;
    this._state.graphState.viewOffset = new THREE.Vector2(0, 0);
    this._state.graphState.selectedNode = null;
  }
}

// Export a singleton instance
export const store = new AnalysisStore();