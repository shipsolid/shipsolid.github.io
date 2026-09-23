import { describe, expect, it } from 'vitest';
import { diffLines, toUnifiedText, MAX_LINES } from './diff-tool';

describe('diffLines', () => {
  it('reports all-equal for identical input', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc');
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.unchanged).toBe(3);
    expect(result.lines.every((l) => l.op === 'equal')).toBe(true);
    expect(result.lines[0]).toMatchObject({ leftNumber: 1, rightNumber: 1 });
  });

  it('detects a single inserted line', () => {
    const result = diffLines('a\nc', 'a\nb\nc');
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.unchanged).toBe(2);
    const inserted = result.lines.find((l) => l.op === 'insert');
    expect(inserted).toMatchObject({ text: 'b', leftNumber: null, rightNumber: 2 });
  });

  it('detects a single removed line', () => {
    const result = diffLines('a\nb\nc', 'a\nc');
    expect(result.removed).toBe(1);
    expect(result.added).toBe(0);
    expect(result.unchanged).toBe(2);
  });

  it('represents a changed line as a delete + an insert', () => {
    const result = diffLines('hello world', 'hello there');
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.unchanged).toBe(0);
  });

  it('ignores whitespace when asked', () => {
    const noisy = diffLines('a  b', 'a b');
    expect(noisy.removed + noisy.added).toBeGreaterThan(0);

    const clean = diffLines('a  b', 'a b', { ignoreWhitespace: true });
    expect(clean.added).toBe(0);
    expect(clean.removed).toBe(0);
    expect(clean.unchanged).toBe(1);
  });

  it('ignores case when asked', () => {
    const result = diffLines('Hello', 'hello', { ignoreCase: true });
    expect(result.unchanged).toBe(1);
    expect(result.added + result.removed).toBe(0);
  });

  it('renders a unified-ish text block', () => {
    const result = diffLines('a\nc', 'a\nb\nc');
    expect(toUnifiedText(result)).toBe(' a\n+b\n c');
  });

  it('handles one empty side', () => {
    const result = diffLines('', 'x\ny');
    expect(result.added).toBe(2);
    expect(result.removed).toBe(0);
    expect(result.unchanged).toBe(0);
  });

  it('throws when a side exceeds the line cap', () => {
    const huge = Array.from({ length: MAX_LINES + 1 }, (_, i) => `line ${i}`).join('\n');
    expect(() => diffLines(huge, 'x')).toThrow(/Input too large for line diff/);
  });
});
