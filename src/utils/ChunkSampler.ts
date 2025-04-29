/**
 * ChunkSampler – picks contiguous unsolved chunk IDs (1–3 per round).
 */
import ProgressStore from '../store/ProgressStore';
import { store } from '../store/AnalysisStore';

export default class ChunkSampler {
  static getAllIds(): string[] {
    // Use all node IDs present in graph state (each entity/node)
    return Array.from(store.state.graphState.nodes.keys());
  }

  static randomSlice(): string[] {
    const all = this.getAllIds();
    const solved = ProgressStore.shared.solvedChunkSet();
    const unsolved = all.filter(id => !solved.has(id));
    if (unsolved.length === 0) return [];

    const start = Math.floor(Math.random() * unsolved.length);
    const maxLen = Math.min(3, unsolved.length - start);
    const len = Math.floor(Math.random() * (maxLen)) + 1;
    return unsolved.slice(start, start + len);
  }
}
