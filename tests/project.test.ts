import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('project shape', () => {
  // criterion: 10.1
  it('ships a complete Kiro spec of requirements, design and tasks', () => {
    const spec = join(root, '.kiro', 'specs', 'ai-monster-courtroom');
    for (const file of ['requirements.md', 'design.md', 'tasks.md']) {
      expect(existsSync(join(spec, file))).toBe(true);
      expect(readFileSync(join(spec, file), 'utf8').length).toBeGreaterThan(1000);
    }
  });

  // criterion: 10.1
  it('numbers every acceptance criterion in the spec', () => {
    const req = readFileSync(join(root, '.kiro', 'specs', 'ai-monster-courtroom', 'requirements.md'), 'utf8');
    const ids = [...req.matchAll(/^(\d+)\.(\d+)\.\s+/gm)].map((m) => `${m[1]}.${m[2]}`);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    expect(ids).toContain('1.1');
    expect(ids).toContain('10.4');
  });

  // criterion: 10.3
  it('declares a Devvit Web app the platform can host', () => {
    const cfg = JSON.parse(readFileSync(join(root, 'devvit.json'), 'utf8'));
    expect(cfg.devvit_web.client.directory).toBe('src/client');
    expect(cfg.devvit_web.server.directory).toBe('src/server');
    expect(cfg.capabilities).toContain('devvit_web');
    expect(cfg.capabilities).toContain('redis');
  });

  // criterion: 10.3
  it('exposes a server entry point the platform can mount', () => {
    expect(existsSync(join(root, 'src', 'server', 'index.ts'))).toBe(true);
    const idx = readFileSync(join(root, 'src', 'server', 'index.ts'), 'utf8');
    expect(idx).toContain("app.post('/api/session'");
    expect(idx).toContain('export default app');
  });

  // criterion: 10.4
  it('carries criterion annotations in the evidence harness', () => {
    const harness = join(root, 'tests', 'test_evidence.py');
    expect(existsSync(harness)).toBe(true);
    const src = readFileSync(harness, 'utf8');
    const annotated = new Set([...src.matchAll(/^\s*#\s*criterion:\s*([0-9]+(?:\.[0-9]+)*)/gm)].map((m) => m[1]));
    const req = readFileSync(join(root, '.kiro', 'specs', 'ai-monster-courtroom', 'requirements.md'), 'utf8');
    for (const m of req.matchAll(/^(\d+)\.(\d+)\.\s+/gm)) {
      expect(annotated.has(`${m[1]}.${m[2]}`)).toBe(true);
    }
  });
});
