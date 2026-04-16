import chalk from 'chalk';
import Table from 'cli-table3';
import {
  createProject,
  listProjects,
  getProject,
  addSessionsToProject,
  removeSessionsFromProject,
  deleteProject,
  getProjectSessionIds,
} from '../core/metadataStore.js';
import { loadAllSessions } from '../core/sessionReader.js';
import { resolveSession } from '../core/sessionResolver.js';
import { formatDate, truncate } from '../utils/format.js';

export async function projectCreateCommand(
  name: string,
  opts: { description?: string },
): Promise<void> {
  try {
    createProject(name, opts.description);
    console.log(chalk.green(`Created project: ${name}`));
    if (opts.description) {
      console.log(chalk.gray(`  ${opts.description}`));
    }
    console.log(
      chalk.gray(
        `\nAdd sessions with: claude-sessions project add "${name}" <session-id>`,
      ),
    );
  } catch (err) {
    console.log(chalk.red((err as Error).message));
  }
}

export async function projectListCommand(opts: {
  json?: boolean;
}): Promise<void> {
  const projects = listProjects();
  const names = Object.keys(projects);

  if (names.length === 0) {
    console.log(chalk.yellow('No projects found.'));
    console.log(
      chalk.gray(
        'Create one with: claude-sessions project create "My Project"',
      ),
    );
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(projects, null, 2));
    return;
  }

  const table = new Table({
    head: [
      chalk.gray('#'),
      chalk.gray('Project'),
      chalk.gray('Description'),
      chalk.gray('Sessions'),
      chalk.gray('Created'),
    ],
    colWidths: [5, 25, 30, 10, 16],
    style: { head: [], border: [] },
    wordWrap: true,
  });

  names.forEach((name, i) => {
    const p = projects[name];
    table.push([
      chalk.gray(`${i + 1}`),
      chalk.bold(name),
      p.description || chalk.gray('-'),
      String(p.sessions.length),
      formatDate(p.created),
    ]);
  });

  console.log(`\n${chalk.bold('Projects')} (${names.length})\n`);
  console.log(table.toString());
}

export async function projectAddCommand(
  projectName: string,
  sessionQueries: string[],
): Promise<void> {
  const project = getProject(projectName);
  if (!project) {
    console.log(chalk.red(`Project "${projectName}" not found.`));
    console.log(chalk.gray('List projects with: claude-sessions project list'));
    return;
  }

  const allSessions = loadAllSessions();
  const resolvedIds: string[] = [];

  for (const query of sessionQueries) {
    const session = resolveSession(query, allSessions);
    if (session) {
      resolvedIds.push(session.id);
      console.log(
        chalk.green(`  + ${truncate(session.summary || session.firstPrompt, 50)}`) +
          chalk.gray(` (${session.id.slice(0, 8)})`),
      );
    } else {
      console.log(chalk.yellow(`  ? Session not found: ${query}`));
    }
  }

  if (resolvedIds.length > 0) {
    addSessionsToProject(projectName, resolvedIds);
    console.log(
      chalk.green(
        `\nAdded ${resolvedIds.length} session(s) to "${projectName}"`,
      ),
    );
  }
}

export async function projectRemoveCommand(
  projectName: string,
  sessionQueries: string[],
): Promise<void> {
  const project = getProject(projectName);
  if (!project) {
    console.log(chalk.red(`Project "${projectName}" not found.`));
    return;
  }

  const allSessions = loadAllSessions();
  const resolvedIds: string[] = [];

  for (const query of sessionQueries) {
    const session = resolveSession(query, allSessions);
    if (session) {
      resolvedIds.push(session.id);
      console.log(
        chalk.yellow(`  - ${truncate(session.summary || session.firstPrompt, 50)}`) +
          chalk.gray(` (${session.id.slice(0, 8)})`),
      );
    } else {
      console.log(chalk.yellow(`  ? Session not found: ${query}`));
    }
  }

  if (resolvedIds.length > 0) {
    removeSessionsFromProject(projectName, resolvedIds);
    console.log(
      chalk.green(
        `\nRemoved ${resolvedIds.length} session(s) from "${projectName}"`,
      ),
    );
  }
}

export async function projectDeleteCommand(name: string): Promise<void> {
  try {
    const project = getProject(name);
    if (!project) {
      console.log(chalk.red(`Project "${name}" not found.`));
      return;
    }
    deleteProject(name);
    console.log(chalk.green(`Deleted project: ${name}`));
    console.log(chalk.gray('Sessions were not affected.'));
  } catch (err) {
    console.log(chalk.red((err as Error).message));
  }
}

export async function projectShowCommand(
  name: string,
  opts: { json?: boolean },
): Promise<void> {
  const project = getProject(name);
  if (!project) {
    console.log(chalk.red(`Project "${name}" not found.`));
    return;
  }

  const allSessions = loadAllSessions();
  const projectSessionIds = new Set(project.sessions);
  const projectSessions = allSessions
    .filter((s) => projectSessionIds.has(s.id))
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          name,
          ...project,
          resolvedSessions: projectSessions.map((s) => ({
            id: s.id,
            summary: s.summary,
            branch: s.branch,
            messageCount: s.messageCount,
            modified: s.modified.toISOString(),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('');
  console.log(chalk.bold('Project: ') + name);
  if (project.description) {
    console.log(chalk.bold('Description: ') + project.description);
  }
  console.log(chalk.bold('Created: ') + formatDate(project.created));
  console.log(chalk.bold('Sessions: ') + `${projectSessions.length}`);
  console.log('');

  if (projectSessions.length === 0) {
    console.log(chalk.gray('No sessions in this project yet.'));
    console.log(
      chalk.gray(
        `Add sessions with: claude-sessions project add "${name}" <session-id>`,
      ),
    );
    return;
  }

  const table = new Table({
    head: [
      chalk.gray('#'),
      chalk.gray('Summary'),
      chalk.gray('Branch'),
      chalk.gray('Msgs'),
    ],
    colWidths: [5, 42, 30, 6],
    style: { head: [], border: [] },
    wordWrap: true,
  });

  projectSessions.forEach((s, i) => {
    const display = s.name || s.summary || truncate(s.firstPrompt, 38);
    table.push([
      chalk.gray(`${i + 1}`),
      display,
      chalk.blue(truncate(s.branch, 28)),
      String(s.messageCount),
    ]);
  });

  console.log(table.toString());
}
