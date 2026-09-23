import { describe, expect, it } from 'vitest';
import { addTab, blankTab, MAX_TABS, removeTab, renameTab, wordCount } from './scratchpad';

describe('blankTab', () => {
  it('returns a well-formed tab', () => {
    const tab = blankTab('Notes');
    expect(tab.id).not.toBe('');
    expect(tab.name).toBe('Notes');
    expect(tab.body).toBe('');
    expect(typeof tab.updated).toBe('number');
  });
});

describe('addTab', () => {
  it('appends a numbered tab', () => {
    const tabs = addTab([blankTab('Scratch 1')]);
    expect(tabs).toHaveLength(2);
    expect(tabs[1].name).toBe('Scratch 2');
  });

  it('throws once the cap is reached', () => {
    let tabs = [blankTab('Scratch 1')];
    while (tabs.length < MAX_TABS) tabs = addTab(tabs);
    expect(tabs).toHaveLength(MAX_TABS);
    expect(() => addTab(tabs)).toThrow(/Maximum of 12 scratch tabs/);
  });
});

describe('renameTab', () => {
  it('renames the matching tab', () => {
    const tabs = [blankTab('A'), blankTab('B')];
    const renamed = renameTab(tabs, tabs[0].id, 'Alpha');
    expect(renamed[0].name).toBe('Alpha');
    expect(renamed[1].name).toBe('B');
  });

  it('throws on an empty name', () => {
    const tabs = [blankTab('A')];
    expect(() => renameTab(tabs, tabs[0].id, '   ')).toThrow(/cannot be empty/);
  });

  it('appends " (2)" on a name collision', () => {
    const tabs = [blankTab('Notes'), blankTab('B')];
    const renamed = renameTab(tabs, tabs[1].id, 'Notes');
    expect(renamed[1].name).toBe('Notes (2)');
  });
});

describe('removeTab', () => {
  it('drops the matching tab', () => {
    const tabs = [blankTab('A'), blankTab('B')];
    expect(removeTab(tabs, tabs[0].id).map((t) => t.name)).toEqual(['B']);
  });

  it('recreates one blank tab when the last is removed', () => {
    const tabs = [blankTab('Only')];
    const after = removeTab(tabs, tabs[0].id);
    expect(after).toHaveLength(1);
    expect(after[0].name).toBe('Scratch 1');
    expect(after[0].body).toBe('');
  });
});

describe('wordCount', () => {
  it('counts words, characters and lines', () => {
    expect(wordCount('hello world\nsecond line')).toEqual({ words: 4, chars: 23, lines: 2 });
    expect(wordCount('')).toEqual({ words: 0, chars: 0, lines: 0 });
  });
});
