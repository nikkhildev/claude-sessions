import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { showCommand } from './commands/show.js';
import { openCommand } from './commands/open.js';
import { tagCommand } from './commands/tag.js';
import { browseCommand } from './commands/browse.js';
import {
  projectCreateCommand,
  projectListCommand,
  projectAddCommand,
  projectRemoveCommand,
  projectDeleteCommand,
  projectShowCommand,
} from './commands/project.js';

const program = new Command();

program
  .name('claude-sessions')
  .description('CLI tool for managing and browsing Claude Code conversations')
  .version('0.4.0');

program
  .command('list')
  .alias('ls')
  .description('List sessions with metadata')
  .option('-p, --project <path>', 'Filter to specific project directory')
  .option('-P, --project-name <name>', 'Filter to a named project')
  .option('-a, --all', 'Show sessions from all projects')
  .option('-l, --limit <n>', 'Number of results', '20')
  .option('-s, --sort <field>', 'Sort by: date, messages, branch', 'date')
  .option('-b, --branch <name>', 'Filter by git branch')
  .option('-t, --tag <name>', 'Filter by custom tag')
  .option('--since <date>', 'Sessions after date (e.g., "2026-04-01", "7d", "2w")')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    listCommand({
      project: opts.project,
      projectName: opts.projectName,
      all: opts.all,
      limit: parseInt(opts.limit, 10),
      sort: opts.sort,
      branch: opts.branch,
      tag: opts.tag,
      since: opts.since,
      json: opts.json,
    });
  });

program
  .command('search <query>')
  .description('Full-text search across session content')
  .option('-p, --project <path>', 'Scope to project')
  .option('-a, --all', 'Search all projects')
  .option('-l, --limit <n>', 'Max results', '10')
  .option('-c, --context <n>', 'Lines of context around match', '2')
  .action((query, opts) => {
    searchCommand(query, {
      project: opts.project,
      all: opts.all,
      limit: parseInt(opts.limit, 10),
      context: parseInt(opts.context, 10),
    });
  });

program
  .command('show <session>')
  .description('Show session details and conversation preview')
  .option('-f, --full', 'Show complete conversation')
  .option('-m, --messages <n>', 'Number of messages to preview', '10')
  .option('--json', 'JSON output')
  .action((session, opts) => {
    showCommand(session, {
      full: opts.full,
      messages: parseInt(opts.messages, 10),
      json: opts.json,
    });
  });

program
  .command('open <session>')
  .description('Open a session in Claude Code')
  .action((session) => {
    openCommand(session);
  });

program
  .command('tag <session> [tags...]')
  .description('Add tags to a session')
  .option('-r, --remove', 'Remove tags instead of adding')
  .action((session, tags, opts) => {
    tagCommand(session, tags, { remove: opts.remove });
  });

program
  .command('untag <session> <tags...>')
  .description('Remove tags from a session')
  .action((session, tags) => {
    tagCommand(session, tags, { remove: true });
  });

program
  .command('browse', { isDefault: true })
  .description('Interactive TUI browser for sessions (default)')
  .option('-p, --project <path>', 'Filter to specific project directory')
  .option('-P, --project-name <name>', 'Filter to a named project')
  .option('-a, --all', 'Show sessions from all projects')
  .action((opts) => {
    browseCommand({
      project: opts.project,
      projectName: opts.projectName,
      all: opts.all || true,
    });
  });

// --- Project management ---
const projectCmd = program
  .command('project')
  .description('Manage named projects (group sessions like Claude.ai folders)');

projectCmd
  .command('create <name>')
  .description('Create a new project')
  .option('-d, --description <text>', 'Project description')
  .action((name, opts) => {
    projectCreateCommand(name, { description: opts.description });
  });

projectCmd
  .command('list')
  .alias('ls')
  .description('List all projects')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    projectListCommand({ json: opts.json });
  });

projectCmd
  .command('show <name>')
  .description('Show project details and its sessions')
  .option('--json', 'Output as JSON')
  .action((name, opts) => {
    projectShowCommand(name, { json: opts.json });
  });

projectCmd
  .command('add <project-name> <sessions...>')
  .description('Add sessions to a project')
  .action((projectName, sessions) => {
    projectAddCommand(projectName, sessions);
  });

projectCmd
  .command('remove <project-name> <sessions...>')
  .description('Remove sessions from a project')
  .action((projectName, sessions) => {
    projectRemoveCommand(projectName, sessions);
  });

projectCmd
  .command('delete <name>')
  .description('Delete a project (sessions are not affected)')
  .action((name) => {
    projectDeleteCommand(name);
  });

program.parse();
