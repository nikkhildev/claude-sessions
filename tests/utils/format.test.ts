import { describe, it, expect } from 'vitest';
import {
  truncate,
  formatDate,
  formatRelativeDate,
  stripSystemTags,
  cleanMessageContent,
  escapeTags,
} from '../../src/utils/format.js';

describe('truncate', () => {
  it('returns string unchanged if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    const result = formatDate('2026-03-15T09:30:00.000Z');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
  });
});

describe('formatRelativeDate', () => {
  it('returns relative time string', () => {
    const recent = new Date(Date.now() - 60000).toISOString();
    const result = formatRelativeDate(recent);
    expect(result).toContain('minute');
  });
});

describe('stripSystemTags', () => {
  it('removes <system-reminder> tags and content', () => {
    const input =
      'hello <system-reminder>secret stuff</system-reminder> world';
    expect(stripSystemTags(input)).toBe('hello  world');
  });

  it('removes <command-message> tags', () => {
    const input =
      '<command-message>daily-worklog</command-message>\n<command-name>/daily-worklog</command-name>';
    expect(stripSystemTags(input)).toBe('');
  });

  it('returns clean text unchanged', () => {
    expect(stripSystemTags('normal text')).toBe('normal text');
  });
});

describe('cleanMessageContent', () => {
  it('extracts text from string content', () => {
    expect(cleanMessageContent('hello world')).toBe('hello world');
  });

  it('extracts text from content array with text blocks', () => {
    const content = [
      { type: 'text', text: 'hello' },
      { type: 'tool_use', name: 'Read', input: {} },
      { type: 'text', text: 'world' },
    ];
    expect(cleanMessageContent(content)).toBe('hello\nworld');
  });

  it('returns empty string for null/undefined', () => {
    expect(cleanMessageContent(null)).toBe('');
    expect(cleanMessageContent(undefined)).toBe('');
  });
});

describe('escapeTags', () => {
  it('replaces { with the {open} entity', () => {
    expect(escapeTags('foo { bar')).toBe('foo {open} bar');
  });

  it('replaces } with the {close} entity', () => {
    expect(escapeTags('foo } bar')).toBe('foo {close} bar');
  });

  it('escapes a blessed-looking color tag so it renders literally', () => {
    expect(escapeTags('{#ff0000-fg}red{/#ff0000-fg}')).toBe(
      '{open}#ff0000-fg{close}red{open}/#ff0000-fg{close}',
    );
  });

  it('leaves text without braces unchanged', () => {
    expect(escapeTags('hello world')).toBe('hello world');
  });

  it('handles JSON-like content that crashes blessed without escaping', () => {
    const json = '{"key": "value"}';
    expect(escapeTags(json)).toBe('{open}"key": "value"{close}');
  });
});
