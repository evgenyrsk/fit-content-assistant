import type { R2Bucket } from '@cloudflare/workers-types';
import type { SourceFileStore } from '../../application/ports/source-file-store.ts';

export class R2SourceFileStore implements SourceFileStore {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, bytes: Uint8Array, metadata: Record<string, string>): Promise<void> {
    await this.bucket.put(key, bytes, {
      httpMetadata: { contentType: 'application/pdf', contentDisposition: 'inline' },
      customMetadata: metadata,
    });
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
