// This file contains all the interfaces for our analysis data
// Ported from Models.swift

/**
 * Saved recall analysis data mapping dates to arrays of saved sentences.
 */
export interface AnalysisData {
  saved_memories: Record<string, string[]>;
}
  
// Previous analysis schema removed. We now only track saved recall memories per date.