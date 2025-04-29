import { BaseDirectory, createDir, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { appDataDir } from '@tauri-apps/api/path';

interface Persist { unlocked: string[]; solved: string[]; }

/**
 * ProgressStore – singleton to track unlocked entities & solved chunks.
 * Persists data to Application Support via Tauri FS.
 */
export default class ProgressStore {
  static shared = new ProgressStore();
  private unlocked: Set<string> = new Set();
  private solvedChunks: Set<string> = new Set();

  private constructor() { this.load(); }

  private async getFilePath(): Promise<string> {
    const dirBase = await appDataDir();
    const dir = dirBase + 'ember';
    await createDir(dir, { recursive: true, dir: BaseDirectory.AppConfig });
    return `${dir}/progress.dat`;
  }

  private async save(): Promise<void> {
    const p: Persist = { unlocked: Array.from(this.unlocked), solved: Array.from(this.solvedChunks) };
    const data = JSON.stringify(p);
    const path = await this.getFilePath();
    // Use new Tauri API signature: file instead of path
    // Write to file at specified AppConfig directory
    await writeTextFile(path, data, { dir: BaseDirectory.AppConfig });
  }

  private async load(): Promise<void> {
    try {
      const path = await this.getFilePath();
      // Use new Tauri API signature: file instead of path
      // Read from file at specified AppConfig directory
      const text = await readTextFile(path, { dir: BaseDirectory.AppConfig });
      const p = JSON.parse(text) as Persist;
      this.unlocked = new Set(p.unlocked);
      this.solvedChunks = new Set(p.solved);
    } catch { /* ignore missing or parse errors */ }
  }

  public unlock(id: string): void {
    if (!this.unlocked.has(id)) {
      this.unlocked.add(id);
      this.save();
    }
  }

  public markChunkSolved(ids: string[], entities: string[]): void {
    let changed = false;
    ids.forEach(id => {
      if (!this.solvedChunks.has(id)) { this.solvedChunks.add(id); changed = true; }
    });
    entities.forEach(e => {
      if (!this.unlocked.has(e)) { this.unlocked.add(e); changed = true; }
    });
    if (changed) this.save();
  }

  public solvedChunkSet(): Set<string> {
    return new Set(this.solvedChunks);
  }

  public isComplete(totalChunks: number): boolean {
    return totalChunks > 0 && this.solvedChunks.size === totalChunks;
  }
}
