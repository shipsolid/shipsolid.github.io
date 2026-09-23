// Pure scratchpad tab model. No DOM; persistence is the page's job. Ids are generated here so
// addTab / removeTab can keep the tab list well-formed on their own.

export interface ScratchTab {
  id: string;
  name: string;
  body: string;
  updated: number;
}

export const MAX_TABS = 12;

function newId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'tab-' + Math.random().toString(36).slice(2, 10);
}

export function blankTab(name = 'Scratch'): ScratchTab {
  return { id: newId(), name, body: '', updated: Date.now() };
}

export function addTab(tabs: ScratchTab[]): ScratchTab[] {
  if (tabs.length >= MAX_TABS) {
    throw new Error(`Maximum of ${MAX_TABS} scratch tabs`);
  }
  return [...tabs, blankTab(`Scratch ${tabs.length + 1}`)];
}

export function renameTab(tabs: ScratchTab[], id: string, name: string): ScratchTab[] {
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new Error('Tab name cannot be empty');
  }
  const taken = new Set(tabs.filter((t) => t.id !== id).map((t) => t.name));
  let finalName = trimmed;
  let n = 2;
  while (taken.has(finalName)) finalName = `${trimmed} (${n++})`;
  return tabs.map((t) => (t.id === id ? { ...t, name: finalName, updated: Date.now() } : t));
}

// Never returns an empty list — removing the last tab yields one fresh blank tab.
export function removeTab(tabs: ScratchTab[], id: string): ScratchTab[] {
  const filtered = tabs.filter((t) => t.id !== id);
  return filtered.length === 0 ? [blankTab('Scratch 1')] : filtered;
}

export function wordCount(body: string): { words: number; chars: number; lines: number } {
  return {
    words: (body.match(/\S+/g) ?? []).length,
    chars: body.length,
    lines: body === '' ? 0 : body.split('\n').length,
  };
}
