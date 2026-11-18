// Stop hook (Kiro hook "kiro-log"). Free (no agent loop): appends a timestamped line with the
// files changed since the last commit to docs/KIRO_LOG.raw.md. The /kiro-log steering command
// later turns this raw trail into the written "how we used Kiro" account.
import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
let stat = '';
try { stat = execSync('git status --porcelain', { encoding: 'utf8' }).trimEnd().split('\n').filter(Boolean).map((l) => l.slice(3)).slice(0, 12).join(', '); } catch {}
mkdirSync('docs', { recursive: true });
appendFileSync('docs/KIRO_LOG.raw.md', `- ${new Date().toISOString()} · ${stat || 'no file changes'}\n`);
