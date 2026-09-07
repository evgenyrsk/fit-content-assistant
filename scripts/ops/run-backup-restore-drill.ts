import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

interface BackupEnvelope {
  format: 'forme-logical-backup';
  version: 1;
  createdAt: string;
  tables: Record<string, Array<Record<string, unknown>>>;
  objects: Array<{ key: string; sha256: string; bytes: number }>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function manifest(envelope: BackupEnvelope) {
  const tableCounts = Object.fromEntries(Object.entries(envelope.tables).map(([name, rows]) => [name, rows.length]));
  const tableHashes = Object.fromEntries(Object.entries(envelope.tables).map(([name, rows]) => [name, sha256(canonical(rows))]));
  return { tableCounts, tableHashes, objectCount: envelope.objects.length, objectHash: sha256(canonical(envelope.objects)) };
}

const source: BackupEnvelope = {
  format: 'forme-logical-backup', version: 1, createdAt: '2026-09-07T00:00:00.000Z',
  tables: {
    sources: [{ id: 'source-1', pmid: '34836013', status: 'active' }],
    claim_versions: [{ id: 'claim-version-1', claim_id: 'claim-1', status: 'needs_review' }],
    audit_events: [{ id: 'audit-1', action: 'backup_fixture_created' }],
  },
  objects: [{ key: 'sources/source-1/fulltext.xml', sha256: sha256('<article>fixture</article>'), bytes: 26 }],
};

const before = manifest(source);
const payload = canonical(source);
const restored = JSON.parse(payload) as BackupEnvelope;
assert.equal(restored.format, 'forme-logical-backup');
assert.equal(restored.version, 1);
assert.deepEqual(manifest(restored), before);
assert.equal(sha256(canonical(restored)), sha256(payload));

console.log(JSON.stringify({
  drill: 'logical-backup-restore', passed: true, backupSha256: sha256(payload), ...before,
}, null, 2));
