import { DataLoader } from './DataLoader';

/**
 * Data structure for a single fill-in-the-blank round
 */
export interface FillRoundData {
  template: string;
  entities: { id: string; text: string }[];
}

/**
 * Service to fetch fill-in-the-blank game rounds
 */
class FillGameService {
  /**
   * Fetch all rounds from mock data or backend
   */
  static async fetchRounds(): Promise<FillRoundData[]> {
    try {
      const raw = await DataLoader.loadJsonFile<any>('fill_rounds.json');
      let rounds: FillRoundData[];
      if (Array.isArray(raw)) {
        rounds = raw;
      } else if (raw && typeof raw === 'object') {
        if ('rounds' in raw && Array.isArray((raw as any).rounds)) {
          rounds = (raw as any).rounds;
        } else {
          rounds = Object.values(raw) as FillRoundData[];
        }
      } else {
        console.warn('Unexpected fill rounds format, defaulting to empty array:', raw);
        rounds = [];
      }
      return rounds;
    } catch (error) {
      console.error('Error fetching fill game rounds:', error);
      throw error;
    }
  }
}

export default FillGameService;