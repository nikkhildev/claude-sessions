import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';

dayjs.extend(relativeTime);

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function formatDate(isoDate: string): string {
  return dayjs(isoDate).format('MMM D, YYYY h:mm A');
}

export function formatShortDate(isoDate: string | Date): string {
  return dayjs(isoDate).format('MMM D');
}

export function formatRelativeDate(isoDate: string | Date): string {
  return dayjs(isoDate).fromNow();
}

export function stripSystemTags(text: string): string {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, '')
    .trim();
}

export function cleanMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return stripSystemTags(content);
  }
  if (Array.isArray(content)) {
    return content
      .filter(
        (block: Record<string, unknown>) =>
          block.type === 'text' && typeof block.text === 'string',
      )
      .map((block: Record<string, unknown>) => block.text as string)
      .join('\n');
  }
  return '';
}
