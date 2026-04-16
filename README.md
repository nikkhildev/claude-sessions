# claude-sessions

CLI tool for managing and browsing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) conversations.

Claude Code stores conversations locally but provides limited tools for finding, organizing, and searching past sessions. `claude-sessions` fills that gap with listing, searching, tagging, and an interactive TUI browser.

## Install

```bash
npm install -g claude-sessions
```

Or use directly with npx:

```bash
npx claude-sessions list --all
```

## Commands

### `list` (alias: `ls`)

List sessions sorted by most recent:

```bash
claude-sessions list              # Sessions for current project
claude-sessions list --all        # All projects
claude-sessions list --branch main --since 7d
claude-sessions list --tag sprint-4
claude-sessions list --json       # JSON output for scripting
```

**Flags:**

| Flag | Description |
|------|-------------|
| `-a, --all` | Show sessions from all projects |
| `-p, --project <path>` | Filter to specific project |
| `-l, --limit <n>` | Number of results (default: 20) |
| `-s, --sort <field>` | Sort by: `date`, `messages`, `branch` |
| `-b, --branch <name>` | Filter by git branch |
| `-t, --tag <name>` | Filter by custom tag |
| `--since <date>` | Sessions after date (e.g., `7d`, `2w`, `2026-04-01`) |
| `--json` | Output as JSON |

### `search`

Full-text search across conversation content:

```bash
claude-sessions search "rate limiting"
claude-sessions search "auth bug" --all --limit 5
```

### `show`

View session details and conversation preview:

```bash
claude-sessions show abc12345     # Partial UUID
claude-sessions show "#3"         # Index from last list
claude-sessions show auth-fix     # Custom name
claude-sessions show abc12 --full # Complete conversation
```

### `open`

Open a session in Claude Code:

```bash
claude-sessions open abc12345
claude-sessions open "#1"
```

### `browse`

Interactive TUI browser with search and preview:

```bash
claude-sessions browse            # Current project
claude-sessions browse --all      # All projects
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate sessions |
| `Enter` | Open in Claude Code |
| `/` | Search |
| `t` | Tag selected session |
| `s` | Toggle sort (date/messages/branch) |
| `?` | Help |
| `q` | Quit |

### `tag` / `untag`

Organize sessions with custom tags:

```bash
claude-sessions tag abc123 sprint-4 auth
claude-sessions untag abc123 auth
```

## Configuration

Optional config at `~/.claude-sessions/config.json`:

```json
{
  "defaultLimit": 20,
  "defaultSort": "date",
  "claudePath": "claude",
  "previewMessages": 10
}
```

## How It Works

- Reads Claude Code's session storage at `~/.claude/projects/` (read-only)
- Uses `sessions-index.json` when available, falls back to parsing JSONL files
- Stores tags and custom names in `~/.claude-sessions/metadata.json`
- **Never modifies** Claude Code's own files

## Session Resolution

Sessions can be referenced by:

1. **Full UUID**: `034523d5-46c1-4c09-b867-468adf04e3af`
2. **Partial UUID**: `034523d5` (minimum 4 chars, must be unambiguous)
3. **Custom name**: `my-auth-fix` (set via tag command)
4. **Index number**: `#3` (from most recent `list` output)

## Requirements

- Node.js 18+
- Claude Code CLI installed

## License

MIT
