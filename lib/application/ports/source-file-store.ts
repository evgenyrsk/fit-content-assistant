export interface SourceFileStore {
  put(key: string, bytes: Uint8Array, metadata: Record<string, string>): Promise<void>;
  delete(key: string): Promise<void>;
}
