/**
 * Types for fill-in-the-blank game rounds
 */
export interface FillRoundData {
  /**
   * Sentence template with blanks represented by '___'
   */
  template: string;
  /**
   * List of entity choices corresponding to blanks
   */
  entities: { id: string; text: string }[];
}