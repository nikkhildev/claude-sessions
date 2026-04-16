import chalk from 'chalk';
import Table from 'cli-table3';
import {
  loadAllSessions,
  findProjectDir,
} from '../core/sessionReader.js';
import { formatRelativeDate, truncate } from '../utils/format.js';
import type { Session, ListOptions } from '../core/types.js';

function parseSinceDate(since: string): Date | null {
  const relativeMatch = since.match(/^(\d+)([dwm])$/);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const now = new Date();
    if (unit === 'd') now.setDate(now.getDate() - num);
    if (unit === 'w') now.setDate(now.getDate() - num * 7);
    if (unit === 'm') now.setMonth(now.getMonth() - num);
    return now;
  }
  const date = new Date(since);
  return isNaN(date.getTime()) ? null : date;
}

function filterSessions(sessions: Session[], opts: ListOptions): Session[] {
  let filtered = sessions.filter((s) => !s.archived);

  if (opts.branch) {
    const branch = opts.branch.toLowerCase();
    filtered = filtered.filter((s) =>
      s.branch.toLowerCase().includes(branch),
    );
  }

  if (opts.tag) {
    filtered = filtered.filter((s) => s.tags.includes(opts.tag!));
  }

  if (opts.since) {
    const since = parseSinceDate(opts.since);
    if (since) {
      filtered = filtered.filter((s) => s.modified >= since);
    }
  }

  return filtered;
}

function sortSessions(sessions: Session[], sortBy: string): Session[] {
  const sorted = [...sessions];
  switch (sortBy) {
    case 'messages':
      return sorted.sort((a, b) => b.messageCount - a.messageCount);
    case 'branch':
      return sorted.sort((a, b) => a.branch.localeCompare(b.branch));
    case 'date':
    default:
      return sorted.sort(
        (a, b) => b.modified.getTime() - a.modified.getTime(),
      );
  }
}

export async function listCommand(opts: ListOptions): Promise<void> {
  let projectDirs: string[] | undefined;

  if (!opts.all && opts.project) {
    const dir = findProjectDir(opts.project);
    if (dir) {
      projectDirs = [dir];
    } else {
      console.log(
        chalk.yellow(`No sessions found for project: ${opts.project}`),
      );
      return;
    }
  } else if (!opts.all) {
    const cwd = process.cwd();
    const dir = findProjectDir(cwd);
    if (dir) projectDirs = [dir];
  }

  const sessions = loadAllSessions(projectDirs);
  const filtered = filterSessions(sessions, opts);
  const sorted = sortSessions(filtered, opts.sort);
  const limited = sorted.slice(0, opts.limit);

  if (opts.json) {
    console.log(
      JSON.stringify(
        limited.map((s) => ({
          id: s.id,
          summary: s.summary,
          firstPrompt: s.firstPrompt,
          branch: s.branch,
          projectPath: s.projectPath,
          messageCount: s.messageCount,
          created: s.created.toISOString(),
          modified: s.modified.toISOString(),
          tags: s.tags,
          name: s.name,
        })),
        null,
        2,
      ),
    );
    return;
  }

  if (limited.length === 0) {
    console.log(chalk.yellow('No sessions found.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.gray('#'),
      chalk.gray('Summary'),
      chalk.gray('Branch'),
      chalk.gray('Msgs'),
      chalk.gray('Modified'),
    ],
    colWidths: [5, 42, 30, 6, 14],
    style: { head: [], border: [] },
    wordWrap: true,
  });

  limited.forEach((session, i) => {
    const display =
      session.name || session.summary || truncate(session.firstPrompt, 38);
    const tags =
      session.tags.length > 0
        ? chalk.cyan(` [${session.tags.join(', ')}]`)
        : '';
    table.push([
      chalk.gray(`${i + 1}`),
      display + tags,
      chalk.blue(truncate(session.branch, 28)),
      String(session.messageCount),
      formatRelativeDate(session.modified),
    ]);
  });

  console.log(
    `\n${chalk.bold('Sessions')} (${filtered.length} total, showing ${limited.length})\n`,
  );
  console.log(table.toString());
  console.log(
    chalk.gray(
      `\nUse ${chalk.white('claude-sessions show <#>')} to view details`,
    ),
  );
}
