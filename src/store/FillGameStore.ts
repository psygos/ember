import { reactive } from 'vue';
import FillGameService, { FillRoundData } from '../utils/FillGameService';

/**
 * Reactive state for the fill-in-the-blank game
 */
interface FillGameState {
  rounds: FillRoundData[];
  currentRoundIndex: number;
  // assignment per blank slot: entity id or null
  assignments: (string | null)[];
  loading: boolean;
  error: string | null;
}

/**
 * Store to manage game rounds and user assignments
 */
class FillGameStore {
  private state = reactive<FillGameState>({
    rounds: [],
    currentRoundIndex: 0,
    assignments: [],
    loading: false,
    error: null
  });

  /**
   * Accessor for reactive state
   */
  public getState() {
    return this.state;
  }

  /**
   * Initialize game by loading rounds
   */
  public async init() {
    this.state.loading = true;
    this.state.error = null;
    try {
      const rounds = await FillGameService.fetchRounds();
      this.state.rounds = rounds;
      this.state.currentRoundIndex = 0;
      this.resetAssignments();
    } catch (e: any) {
      this.state.error = e?.message || 'Failed to load game rounds';
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Reset assignments for the current round
   */
  public resetAssignments() {
    const round = this.state.rounds[this.state.currentRoundIndex];
    if (round) {
      this.state.assignments = Array(round.entities.length).fill(null);
    } else {
      this.state.assignments = [];
    }
  }

  /**
   * Assign an entity to a blank slot
   */
  public assignEntity(slotIndex: number, entityId: string) {
    if (
      slotIndex >= 0 &&
      slotIndex < this.state.assignments.length &&
      !this.isRoundComplete()
    ) {
      this.state.assignments[slotIndex] = entityId;
    }
  }

  /**
   * Check if all blanks have been filled
   */
  public isRoundComplete(): boolean {
    return this.state.assignments.length > 0 &&
      this.state.assignments.every(a => a !== null);
  }

  /**
   * Advance to the next round, if available
   */
  public nextRound() {
    if (this.state.currentRoundIndex < this.state.rounds.length - 1) {
      this.state.currentRoundIndex++;
      this.resetAssignments();
    }
  }
}

/**
 * Singleton instance of the FillGameStore
 */
export default new FillGameStore();