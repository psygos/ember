/* eslint-disable @typescript-eslint/no-unsafe-return */

import { readTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { z }            from 'zod';

/* ------------------------------------------------------------------ *
 *  Public API
 * ------------------------------------------------------------------ */

export type JsonMap          = Record<string, unknown>;
export type LoadResult<T>    = { ok: true;  data: T }
                            | { ok: false; error: DataLoaderError };

export class DataLoaderError extends Error {
  constructor(public readonly kind:
      | 'fs-unavailable'     // window.__TAURI_IPC__ missing
      | 'file-not-found'     // 404 / ENOENT
      | 'json-parse-failed'  // invalid JSON
      | 'schema-invalid',    // zod validation failed
    public readonly detail: unknown) {
    super(kind);
  }
}

/**
 * Singleton accessor – avoids multiple FS probes.
 */
export const DataLoader = new (class {
  /* Detect Tauri at runtime ------------------------------------------------ */
  // Native Tauri FS availability will be detected by attempting readTextFile

  /* Generic loader --------------------------------------------------------- */
  async loadJsonFile<T>(
      fileName: string,
      schema?: z.ZodSchema<T>
    ): Promise<LoadResult<T>> {

    /* 1️⃣  Attempt native FS read (Tauri / Node) -------------------------- */
    // Try Tauri FS read
    try {
      const text = await readTextFile(fileName, { dir: BaseDirectory.Resource });
      return this.parse(text, schema);
    } catch {
      // ignore and fall back
    }
    // Try Node FS for tests
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const fs = await import('fs/promises');
        const text = await fs.readFile(`public/${fileName}`, 'utf-8');
        return this.parse(text, schema);
      } catch {
        // ignore and fall back
      }
    }

    /* 2️⃣  Fall back to HTTP fetch (browser / dev) ----------------------- */
    try {
      const response = await fetch(`/${fileName}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const text = await response.text();
      return this.parse(text, schema);
    } catch (err: any) {
      return { ok: false, error: new DataLoaderError('file-not-found', err) };
    }
  }

  /* Internal helpers ------------------------------------------------------- */
  private parse<T>(raw: string, schema?: z.ZodSchema<T>): LoadResult<T> {
    try {
      const json = JSON.parse(raw) as unknown;
      if (schema) {
        const data = schema.parse(json);
        return { ok: true, data };
      }
      return { ok: true, data: json as T };
    } catch (err: any) {
      const kind = err instanceof z.ZodError ? 'schema-invalid'
                 : err instanceof SyntaxError   ? 'json-parse-failed'
                 : 'json-parse-failed';
      return { ok: false, error: new DataLoaderError(kind, err) };
    }
  }
})();

/* ------------------------------------------------------------------ *
 *  Schemas used elsewhere in the app – kept here to avoid dupes.
 * ------------------------------------------------------------------ */

export const ChunkCacheSchema = z.record(
  z.object({
    scenes: z.array(z.object({
      id:       z.number(),
      memory:   z.string().min(1),
      entities: z.array(z.object({
        text: z.string().min(1),
        type: z.string().min(1)
      })).min(1)
    })).optional() // some entries legitimately have no scenes
  }).passthrough() // allow extra properties
);

/** Type of the validated chunk cache JSON */
export type ChunkCache = z.infer<typeof ChunkCacheSchema>;

export default DataLoader;
