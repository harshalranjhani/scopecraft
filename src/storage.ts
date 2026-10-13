import { backupSchema, defaultSettings, type Proposal, type Settings } from './domain';
import { examples } from './examples';

export const STORAGE_KEY = 'scopecraft.workspace.v1';
export function loadWorkspace() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { proposals: examples, settings: defaultSettings, warning: '' };
  try {
    const data = backupSchema.parse(JSON.parse(raw));
    return { proposals: data.proposals, settings: data.settings, warning: '' };
  } catch {
    // Keep unreadable data intact so it can be recovered, rather than overwriting it.
    return { proposals: examples, settings: defaultSettings, warning: 'Saved data could not be read. Export your current workspace before replacing it. The original browser data has been preserved.' };
  }
}
export function saveWorkspace(proposals: Proposal[], settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, proposals, settings }));
}
export function downloadFile(name: string, contents: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
