import { BaseDirectory, createDir, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { appDataDir } from '@tauri-apps/api/path';

/**
 * Persistence – helper to read/write JSON under AppConfig/AppData
 */
export default class Persistence {
  static async writeJSON<T>(folder: string, filename: string, data: T): Promise<void> {
    const base = await appDataDir();
    const dir = base + folder;
    await createDir(dir, { recursive: true, dir: BaseDirectory.AppConfig });
    const path = `${dir}/${filename}`;
    // Write JSON data to file in AppConfig
    await writeTextFile({ path, contents: JSON.stringify(data) }, { dir: BaseDirectory.AppConfig });
  }

  static async readJSON<T>(folder: string, filename: string): Promise<T | null> {
    try {
      const base = await appDataDir();
      const path = `${base}${folder}/${filename}`;
      const text = await readTextFile(path, { dir: BaseDirectory.AppConfig });
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
}
