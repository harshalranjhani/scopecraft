import { test } from 'node:test';
import assert from 'node:assert/strict';
import { briefSchema, quote, scopeSchema, proposalMarkdown, defaultSettings } from '../src/domain';

const scope = { summary: 'A focused website project.', deliverables: [{ title: 'Design', description: 'Three page layouts.', hours: 3.5 }], exclusions: ['Hosting'], questions: ['Who writes copy?'], risks: [{ severity: 'medium' as const, title: 'Content', detail: 'Copy is not confirmed.' }] };
test('quote uses integer cents, applies a buffer, and calculates a deposit', () => {
  assert.deepEqual(quote({ scope, hourlyRate: 85.15, bufferPercent: 15 }), { hours: 3.5, subtotal: 29803, buffer: 4470, total: 34273, deposit: 17137 });
});
test('input rejects short briefs, invalid currencies, and negative rates', () => {
  assert.equal(briefSchema.safeParse({ clientName: 'A', projectName: 'B', brief: 'too short', hourlyRate: -1, currency: 'ZZZ', bufferPercent: 10 }).success, false);
});
test('model output rejects missing deliverables and runaway estimates', () => {
  assert.equal(scopeSchema.safeParse({ ...scope, deliverables: [] }).success, false);
  assert.equal(scopeSchema.safeParse({ ...scope, deliverables: [{ ...scope.deliverables[0], hours: 99999 }] }).success, false);
});
test('client export includes the scope and excludes private risk notes', () => {
  const text = proposalMarkdown({ id: '1', clientName: 'Acme', projectName: 'Website', brief: 'x'.repeat(80), hourlyRate: 85, currency: 'USD', bufferPercent: 15, scope, createdAt: new Date().toISOString(), status: 'draft', source: 'local-ai', model: 'qwen', generationMs: 1 }, defaultSettings);
  assert.match(text, /Acme/); assert.match(text, /Three page layouts/); assert.doesNotMatch(text, /Copy is not confirmed/);
});
