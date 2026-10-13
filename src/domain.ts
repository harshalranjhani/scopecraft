import { z } from 'zod';

export const briefSchema = z.object({
  clientName: z.string().trim().min(1).max(100),
  projectName: z.string().trim().min(1).max(120),
  brief: z.string().trim().min(80, 'Add at least 80 characters so the model has enough context.').max(8000),
  hourlyRate: z.number().min(1).max(10000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']),
  bufferPercent: z.number().min(0).max(50),
});

export const scopeSchema = z.object({
  summary: z.string().min(10).max(1400),
  deliverables: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(600),
    hours: z.number().min(1).max(200),
  })).min(1).max(8),
  exclusions: z.array(z.string().min(1).max(300)).min(1).max(6),
  questions: z.array(z.string().min(1).max(300)).min(1).max(6),
  risks: z.array(z.object({
    severity: z.enum(['high', 'medium', 'low']),
    title: z.string().min(1).max(100),
    detail: z.string().min(1).max(400),
  })).min(1).max(6),
});

export const proposalSchema = briefSchema.extend({
  id: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  status: z.enum(['draft', 'ready', 'accepted']),
  scope: scopeSchema,
  source: z.enum(['local-ai', 'example']),
  model: z.string().max(100),
  generationMs: z.number().min(0),
});

export const settingsSchema = z.object({
  name: z.string().max(100), studio: z.string().max(100), email: z.string().max(200),
  hourlyRate: z.number().min(1).max(10000), currency: briefSchema.shape.currency,
  bufferPercent: z.number().min(0).max(50),
});
export const backupSchema = z.object({ version: z.literal(1), proposals: z.array(proposalSchema).max(200), settings: settingsSchema });
export type Brief = z.infer<typeof briefSchema>;
export type Scope = z.infer<typeof scopeSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = { name: 'Independent freelancer', studio: 'Your studio', email: '', hourlyRate: 85, currency: 'USD', bufferPercent: 15 };

// Prices use integer cents; only the person reviewing the scope sets the final hours and rate.
export function quote(proposal: Pick<Proposal, 'scope' | 'hourlyRate' | 'bufferPercent'>) {
  const hours = proposal.scope.deliverables.reduce((sum, item) => sum + item.hours, 0);
  const subtotal = proposal.scope.deliverables.reduce((sum, item) => sum + Math.round(item.hours * Math.round(proposal.hourlyRate * 100)), 0);
  const buffer = Math.round(subtotal * proposal.bufferPercent / 100);
  return { hours, subtotal, buffer, total: subtotal + buffer, deposit: Math.round((subtotal + buffer) / 2) };
}

export function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

export function proposalMarkdown(p: Proposal, settings: Settings) {
  const q = quote(p);
  return `# ${p.projectName}\n\nPrepared for **${p.clientName}** by **${settings.studio || settings.name}**\n${settings.email}\n\n## Project overview\n\n${p.scope.summary}\n\n## Scope of work\n\n${p.scope.deliverables.map((d, i) => `${i + 1}. **${d.title}** — ${d.description}\n   Estimated effort: ${d.hours} hours · ${money(Math.round(d.hours * Math.round(p.hourlyRate * 100)), p.currency)}`).join('\n\n')}\n\n## Investment\n\nBase estimate: ${money(q.subtotal, p.currency)}\nContingency (${p.bufferPercent}%): ${money(q.buffer, p.currency)}\n**Total: ${money(q.total, p.currency)}**\nProposed 50% deposit: ${money(q.deposit, p.currency)}\n\n## Outside this scope\n\n${p.scope.exclusions.map(s => `- ${s}`).join('\n')}\n\n## Before we begin\n\n${p.scope.questions.map(s => `- ${s}`).join('\n')}\n\n## Working together\n\nThis estimate is subject to confirmation of the scope and open questions. Additional work requires a separate estimate and approval. Dates will be agreed after scope confirmation.\n\nPrepared with ScopeCraft. Reviewed estimates should be confirmed before sending.\n`;
}
