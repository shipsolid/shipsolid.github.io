import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TOOLS,
  TOOL_FAMILIES,
  getTool,
  groupedTools,
  toolsInFamily,
  type ToolFamily,
} from './tools';

const FAMILY_IDS = TOOL_FAMILIES.map((f) => f.id);

describe('TOOL_FAMILIES', () => {
  it('has exactly the four expected families with unique ids', () => {
    expect(FAMILY_IDS).toEqual(['build', 'observe', 'operate', 'focus']);
    expect(new Set(FAMILY_IDS).size).toBe(4);
  });

  it('gives every family a label and a blurb', () => {
    for (const family of TOOL_FAMILIES) {
      expect(family.label.trim()).not.toBe('');
      expect(family.blurb.trim()).not.toBe('');
    }
  });
});

describe('TOOLS manifest', () => {
  it('has unique slugs', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every tool a non-empty title, description, and at least one tag', () => {
    for (const tool of TOOLS) {
      expect(tool.title.trim(), tool.slug).not.toBe('');
      expect(tool.description.trim(), tool.slug).not.toBe('');
      expect(tool.tags.length, tool.slug).toBeGreaterThan(0);
      expect(
        tool.tags.every((tag) => typeof tag === 'string' && tag.trim() !== ''),
        tool.slug
      ).toBe(true);
    }
  });

  it('assigns every tool to a real family', () => {
    for (const tool of TOOLS) {
      expect(FAMILY_IDS, tool.slug).toContain(tool.family);
    }
  });

  it('uses only known statuses', () => {
    for (const tool of TOOLS) {
      expect(['stable', 'beta', 'planned'], tool.slug).toContain(tool.status);
    }
  });

  it('derives href from slug for every tool except pomodoro', () => {
    for (const tool of TOOLS) {
      if (tool.slug === 'pomodoro') {
        expect(tool.href).toBe('/pomo');
      } else {
        expect(tool.href, tool.slug).toBe(`/tools/${tool.slug}`);
      }
    }
  });
});

describe('grouping helpers', () => {
  it('groupedTools() covers every tool exactly once', () => {
    const grouped = groupedTools();
    expect(grouped).toHaveLength(TOOL_FAMILIES.length);
    const total = grouped.reduce((sum, g) => sum + g.tools.length, 0);
    expect(total).toBe(TOOLS.length);

    const seen = new Set<string>();
    for (const { tools } of grouped) {
      for (const tool of tools) seen.add(tool.slug);
    }
    expect(seen.size).toBe(TOOLS.length);
  });

  it('toolsInFamily() lists shipped tools before planned ones', () => {
    for (const id of FAMILY_IDS as ToolFamily[]) {
      const statuses = toolsInFamily(id).map((t) => t.status);
      const firstPlanned = statuses.indexOf('planned');
      if (firstPlanned !== -1) {
        expect(statuses.slice(firstPlanned).every((s) => s === 'planned')).toBe(true);
      }
    }
  });

  it('getTool() round-trips every slug and rejects unknowns', () => {
    for (const tool of TOOLS) {
      expect(getTool(tool.slug)?.slug).toBe(tool.slug);
    }
    expect(getTool('does-not-exist')).toBeUndefined();
  });
});

describe('manifest <-> filesystem', () => {
  // Every shipped tool must have a real page on disk. Planned tools are roadmap
  // entries with no page yet; pomodoro lives at src/pages/pomo.astro.
  it('every non-planned tool has a page file', () => {
    for (const tool of TOOLS) {
      if (tool.status === 'planned' || tool.slug === 'pomodoro') continue;
      const pageUrl = new URL(`../pages/tools/${tool.slug}.astro`, import.meta.url);
      expect(existsSync(fileURLToPath(pageUrl)), `missing page for ${tool.slug}`).toBe(true);
    }
  });
});
