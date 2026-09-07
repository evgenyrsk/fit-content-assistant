import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { approvedStyleProfile } from '../../lib/application/orchestration/approved-style-profile.ts';

interface Case { id: string; format: string; preferred: string; rejected: string; workingExplanation: string }
const cases = JSON.parse(await readFile(new URL('../../evals/style-profile-v1.json', import.meta.url), 'utf8')) as Case[];
const avoided = approvedStyleProfile.avoidedPhrases.map((phrase) => phrase.toLowerCase());
const result = cases.map((item) => {
  const preferred = item.preferred.toLowerCase();
  const rejected = item.rejected.toLowerCase();
  const preferredViolations = avoided.filter((phrase) => preferred.includes(phrase));
  const rejectedDetections = avoided.filter((phrase) => rejected.includes(phrase));
  return {
    id: item.id, format: item.format,
    passed: preferredViolations.length === 0 && rejectedDetections.length > 0 && item.workingExplanation.length >= 30,
    preferredViolations, rejectedDetections,
  };
});
const passed = result.filter((item) => item.passed).length;
console.log(JSON.stringify({ profile: approvedStyleProfile.version, cases: cases.length, passed, result }, null, 2));
if (passed !== cases.length) process.exitCode = 1;
