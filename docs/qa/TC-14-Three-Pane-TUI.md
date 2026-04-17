# QA Smoke Test: Issue #14 — Three-Pane TUI (claude-sessions)

**Issue**: https://github.com/nikkhildev/claude-sessions/issues/14 | **Version**: v0.4.0 | **Date**: 2026-04-16

---

## Summary

| Priority | Count | Types |
|----------|-------|-------|
| CRITICAL | 8     | 6 POSITIVE, 2 NEGATIVE |
| HIGH     | 9     | 5 POSITIVE, 2 NEGATIVE, 2 SECURITY |
| MEDIUM   | 8     | 4 POSITIVE, 3 NEGATIVE, 1 REGRESSION |
| **Total** | **25** | |

### Context

Issue #14 redesigns the `claude-sessions` TUI into a three-pane macOS Finder–style layout:
- **Left pane**: Projects (All + custom named projects)
- **Middle pane**: Sessions filtered by selected project
- **Right pane**: Preview (metadata + conversation)

Default command `claude-sessions` with no args opens the TUI directly. All three panes support keyboard navigation via Tab/Shift+Tab, with focus indicated by a green (`#00d4aa`) border. All existing CLI commands (`list`, `search`, `show`, `open`, `tag`, `project`) continue to work unchanged.

### Environment

- Node.js 18+
- Claude Code CLI installed and has at least 5 past sessions across multiple git branches
- At least one session with tags (create via `claude-sessions tag <id> test-tag`)
- claude-sessions installed globally: `npm install -g claude-code-sessions` or `npm link` from local checkout
- Terminal size: minimum 100×30 (wider is better)

---

## Quick Smoke Test — 25 Cases

| # | Test | Priority | Type | What to verify |
|---|------|----------|------|----------------|
| C001 | Default command opens TUI | CRITICAL | POSITIVE | `claude-sessions` with no args → TUI opens |
| C002 | Three panes render correctly | CRITICAL | POSITIVE | Projects / Sessions / Preview all visible with borders |
| C003 | Sessions pane is focused on launch | CRITICAL | POSITIVE | Middle pane has green border initially |
| C004 | Tab cycles focus forward | CRITICAL | POSITIVE | Tab: Sessions → Preview → Projects → Sessions |
| C005 | Shift+Tab cycles focus backward | CRITICAL | POSITIVE | Shift+Tab cycles in reverse |
| C006 | Arrow keys navigate within focused pane | CRITICAL | POSITIVE | Up/Down moves selection only in active pane |
| C007 | Enter on session opens in Claude Code | CRITICAL | POSITIVE | TUI exits, `claude --resume <id>` runs |
| C008 | Quit with `q` exits cleanly | CRITICAL | NEGATIVE | Terminal restored, no stack trace |
| H001 | Project pane shows "All" + custom projects | HIGH | POSITIVE | Created projects appear in left pane |
| H002 | Selecting project filters sessions | HIGH | POSITIVE | Enter on project → middle pane shows only that project's sessions |
| H003 | "All" selection clears project filter | HIGH | POSITIVE | Selecting "All" shows all sessions |
| H004 | Preview updates on session selection | HIGH | POSITIVE | Up/Down in sessions updates right pane live |
| H005 | Search filters sessions | HIGH | POSITIVE | Press `/`, type query, matching sessions shown |
| H006 | Sort cycles date → messages → branch | HIGH | POSITIVE | Press `s` repeatedly, order changes |
| H007 | Help overlay displays and dismisses | HIGH | POSITIVE | `?` shows help, any key closes it |
| H008 | Escape clears search filter | HIGH | NEGATIVE | Search active → Esc → all sessions restored |
| H009 | No sessions state handled gracefully | HIGH | NEGATIVE | Empty project shows "No sessions found" message |
| M001 | Tag session from TUI | MEDIUM | POSITIVE | `t` → enter tags → preview shows new tags |
| M002 | Remove tag from TUI | MEDIUM | POSITIVE | `T` (shift) → pick tag → removed from preview |
| M003 | Create new project from TUI | MEDIUM | POSITIVE | `n` → enter name → appears in left pane |
| M004 | Add session to project from TUI | MEDIUM | POSITIVE | `a` → select project → session added |
| M005 | Remove session from active project | MEDIUM | POSITIVE | `r` in filtered project view → session removed from list |
| M006 | Duplicate project name handled silently | MEDIUM | NEGATIVE | Creating an existing project name doesn't crash |
| M007 | Invalid search query returns empty | MEDIUM | NEGATIVE | Search for "zxcvbn12345" → "No sessions found" |
| M008 | Existing CLI subcommands still work | MEDIUM | REGRESSION | `list`, `search`, `show`, `project list` all unchanged |
| H010 | File permissions on metadata.json | HIGH | SECURITY | `~/.claude-sessions/metadata.json` is user-read/writable only |
| H011 | No modification of Claude's files | HIGH | SECURITY | JSONL files in `~/.claude/projects/` remain untouched |

---

### TC-C001 | Default command opens TUI

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: `claude-sessions` installed globally (`which claude-sessions` returns a path). At least one Claude Code session exists.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open terminal, run `claude-sessions` with no subcommand | TUI opens filling the terminal |
| 2 | Observe initial screen | Three vertical panes + status bar at bottom |
| 3 | Check status bar content | Shows `Tab switch pane | [project] sort:date  N/N | ? help` |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C002 | Three panes render correctly

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI open (`claude-sessions`)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look at the leftmost pane | Labeled "Projects", ~18% width |
| 2 | Look at the middle pane | Labeled "Sessions (N)" with session count, ~32% width |
| 3 | Look at the rightmost pane | Labeled "Preview -- <title>", ~50% width |
| 4 | Verify borders are visible between panes | All three have line borders |
| 5 | Verify text is readable | Titles in white/bold, metadata in muted gray |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C003 | Sessions pane is focused on launch

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI just opened

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe border colors | Middle (Sessions) border is teal/green (`#00d4aa`) |
| 2 | Observe other two pane borders | Projects and Preview have gray/dim borders (`#444444`) |
| 3 | Press Up/Down arrow | Selection moves in the Sessions list only |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C004 | Tab cycles focus forward

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI open, Sessions pane focused

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `Tab` once | Focus moves to Preview pane (green border on right pane) |
| 2 | Press `Tab` again | Focus moves to Projects pane (green border on left pane) |
| 3 | Press `Tab` again | Focus returns to Sessions pane (green border on middle pane) |
| 4 | Each time, verify only ONE pane has a green border | No overlap or stuck focus |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C005 | Shift+Tab cycles focus backward

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI open, Sessions pane focused

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `Shift+Tab` once | Focus moves to Projects pane |
| 2 | Press `Shift+Tab` again | Focus moves to Preview pane |
| 3 | Press `Shift+Tab` again | Focus returns to Sessions pane |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C006 | Arrow keys navigate within focused pane only

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI open, at least 3 sessions visible

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sessions pane focused; press `Down` | Highlight moves to next session. Preview updates live |
| 2 | Press `Tab` to focus Projects | Projects pane border green |
| 3 | Press `Down` | Highlight moves in Projects pane. Sessions list does NOT change selection |
| 4 | Press `Tab` twice to focus Preview | Preview border green |
| 5 | Press `Down` | Preview content scrolls down. Sessions selection unchanged |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C007 | Enter on session opens Claude Code

**Priority**: CRITICAL | **Type**: POSITIVE

**Pre**: TUI open, at least 1 session visible, `claude` binary is in PATH

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Highlight a session in Sessions pane | Preview updates with session details |
| 2 | Press `Enter` | TUI exits cleanly; terminal returns to shell briefly; Claude Code launches with `--resume <id>` |
| 3 | Observe Claude Code | Resumes the exact session (same conversation history) |
| 4 | Exit Claude Code | Returns to your terminal prompt (not the TUI) |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-C008 | Quit with `q` exits cleanly

**Priority**: CRITICAL | **Type**: NEGATIVE

**Pre**: TUI open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `q` | TUI immediately exits, terminal prompt restored |
| 2 | Observe terminal state | No stack trace, no leftover rendering artifacts |
| 3 | Run `echo $?` | Returns `0` (clean exit) |
| 4 | Alternative: open TUI again and press `Ctrl+C` | Same clean exit behavior |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H001 | Project pane shows "All" + custom projects

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: Before opening TUI, create two projects via CLI:
```bash
claude-sessions project create "Test Project A"
claude-sessions project create "Test Project B"
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open TUI | Left pane lists: `> All`, `  Test Project A`, `  Test Project B` |
| 2 | Verify "All" is selected by default (shown with `>` marker) | Yes |
| 3 | Focus Projects pane with Tab | Border goes green |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H002 | Selecting project filters sessions

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: A project "Test Project A" exists and has at least 1 session added to it (via `claude-sessions project add "Test Project A" <session-id>`).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open TUI, note total session count in middle pane label | e.g. "Sessions (285)" |
| 2 | Focus Projects pane (Tab twice) | Green border on left |
| 3 | Navigate to "Test Project A" and press `Enter` | Sessions pane now shows only sessions in that project |
| 4 | Middle pane label updates | e.g. "Sessions (1)" |
| 5 | Status bar shows `[Test Project A]` | Yes |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H003 | "All" selection clears project filter

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: TUI filtered to a project (from TC-H002)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Focus Projects pane | Green border |
| 2 | Navigate to "> All" (top) and press `Enter` | Sessions pane shows all sessions again |
| 3 | Status bar shows `All` instead of `[project name]` | Yes |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H004 | Preview updates on session selection

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: TUI open with multiple sessions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sessions pane focused, select first session | Preview shows session 1's title, branch, date, messages, ID |
| 2 | Press `Down` | Preview instantly switches to session 2's data |
| 3 | Press `Down` again | Preview updates again |
| 4 | Verify conversation messages appear below metadata (`> You` and `< Claude` labels) | Yes |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H005 | Search filters sessions

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: TUI open, multiple sessions loaded

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `/` | A search input box appears centered |
| 2 | Type a keyword likely to match a real session (e.g. "auth" or "fix") | Characters appear in box |
| 3 | Press `Enter` | Search box closes; Sessions pane filters to matches |
| 4 | Middle pane label reflects count | e.g. "Sessions (5)" |
| 5 | Status bar shows `search: "auth"` | Yes |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H006 | Sort cycles date → messages → branch

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: TUI open, Sessions pane focused

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note current order (should be by date, newest first) | Status bar shows `sort:date` |
| 2 | Press `s` | Sessions re-ordered; status bar shows `sort:messages` (most messages first) |
| 3 | Press `s` again | Status bar shows `sort:branch`; sessions ordered alphabetically by branch |
| 4 | Press `s` once more | Cycles back to `sort:date` |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H007 | Help overlay displays and dismisses

**Priority**: HIGH | **Type**: POSITIVE

**Pre**: TUI open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `?` | Centered "Keyboard Shortcuts" modal appears |
| 2 | Verify sections visible: NAVIGATE, SEARCH & SORT, ORGANIZE | All three sections with key + description |
| 3 | Press any key (e.g. spacebar) | Modal closes, normal TUI restored |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H008 | Escape clears search filter

**Priority**: HIGH | **Type**: NEGATIVE

**Pre**: Active search in TUI (from TC-H005)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Status bar shows `search: "<query>"` | Yes |
| 2 | Press `Esc` | Search cleared, all sessions restored |
| 3 | Status bar no longer shows search text | Yes |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H009 | No sessions state handled gracefully

**Priority**: HIGH | **Type**: NEGATIVE

**Pre**: Create an empty project: `claude-sessions project create "Empty Project"`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open TUI, navigate to "Empty Project" in Projects pane, press Enter | Sessions pane shows "Sessions (0)" label |
| 2 | Preview pane shows message | "No sessions found" in gray |
| 3 | No crash, no layout break | TUI still usable, can switch back to "All" |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H010 | Sidecar metadata file permissions (SECURITY)

**Priority**: HIGH | **Type**: SECURITY

**Pre**: Used `claude-sessions` at least once (metadata file created)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `ls -l ~/.claude-sessions/metadata.json` | File owned by current user, not world-readable |
| 2 | Check permissions | `rw-------` (600) or `rw-r--r--` (644) acceptable. Not `rwxrwxrwx` |
| 3 | Verify file content is plain JSON | `cat` shows valid JSON with `version: 1`, `sessions: {}`, `projects: {}` |

**Security note**: Metadata may include branch names, session IDs, and custom tags that could reveal work context. Should not be world-readable.

**Result**: [ ] PASS / [ ] FAIL

---

### TC-H011 | No modification of Claude's files (SECURITY)

**Priority**: HIGH | **Type**: SECURITY

**Pre**: A known JSONL session file exists at `~/.claude/projects/<project-hash>/<session-id>.jsonl`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Capture current checksum: `sha256sum ~/.claude/projects/<project-hash>/<session-id>.jsonl` | Record hash |
| 2 | Open TUI, navigate to that session, tag it with `t`, add to project with `a`, then quit | All actions succeed |
| 3 | Re-run checksum | Hash is **identical** — file was not modified |
| 4 | Run `stat -c %y ~/.claude/projects/<project-hash>/<session-id>.jsonl` for mtime | mtime unchanged from before step 2 |

**Security note**: claude-sessions is strictly read-only on Claude Code's data directory. Any write would be a contract violation.

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M001 | Tag session from TUI

**Priority**: MEDIUM | **Type**: POSITIVE

**Pre**: TUI open, a session selected in Sessions pane

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `t` | Input box appears: "Add tags (comma-separated)" |
| 2 | Type `urgent,review` and press Enter | Box closes |
| 3 | Preview pane updates | Shows `Tags: #urgent #review` below metadata |
| 4 | Verify persistence: quit TUI, re-run `claude-sessions`, navigate back to same session | Tags still present |
| 5 | Check file: `cat ~/.claude-sessions/metadata.json | grep -A3 <session-id>` | `tags: ["urgent","review"]` present |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M002 | Remove tag from TUI

**Priority**: MEDIUM | **Type**: POSITIVE

**Pre**: Session with tags (from TC-M001)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select the tagged session | Preview shows tags |
| 2 | Press `T` (Shift+t) | Popup list of current tags appears |
| 3 | Select "urgent" and press Enter | Popup closes |
| 4 | Preview updates | `Tags:` now shows only `#review` |
| 5 | Check metadata file | `"tags": ["review"]` |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M003 | Create new project from TUI

**Priority**: MEDIUM | **Type**: POSITIVE

**Pre**: TUI open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `n` | Input box: "New project name" |
| 2 | Type "Sprint Planning" and press Enter | Box closes |
| 3 | Check Projects pane | "Sprint Planning" added to list |
| 4 | Check metadata file | `projects: { "Sprint Planning": { sessions: [], created: "..." } }` |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M004 | Add session to project from TUI

**Priority**: MEDIUM | **Type**: POSITIVE

**Pre**: At least one project exists; TUI open, a session selected

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `a` | Popup list of projects appears with last item "+ New Project" |
| 2 | Select an existing project, press Enter | Popup closes |
| 3 | Navigate to that project in Projects pane, select it | Sessions list shows the added session |
| 4 | Press `a` on the same session again | Popup now shows project with "(added)" marker next to it |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M005 | Remove session from active project

**Priority**: MEDIUM | **Type**: POSITIVE

**Pre**: A project exists with at least 1 session; TUI open and filtered to that project

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sessions pane shows sessions in the project | Yes |
| 2 | Select a session, press `r` | Session immediately removed from Sessions pane |
| 3 | Session count label decreases | e.g. "Sessions (3)" → "Sessions (2)" |
| 4 | Switch to "All" project | Session still appears there (it's only removed from the project, not deleted) |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M006 | Duplicate project name handled silently

**Priority**: MEDIUM | **Type**: NEGATIVE

**Pre**: A project named "Test Dup" exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open TUI, press `n` | Input box appears |
| 2 | Type "Test Dup" and press Enter | Box closes |
| 3 | Observe Projects pane | No crash, no error message, project still listed once |
| 4 | Check metadata file | Single entry for "Test Dup", not duplicated |

**Note**: CLI command `claude-sessions project create "Test Dup"` SHOULD show an error message on stderr. TUI intentionally swallows the error because the user can see the project already exists.

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M007 | Invalid search query returns empty gracefully

**Priority**: MEDIUM | **Type**: NEGATIVE

**Pre**: TUI open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press `/` to search | Input box opens |
| 2 | Type a guaranteed-no-match query like `zxcvbnm99999asdf` and press Enter | Box closes |
| 3 | Sessions pane | Shows "Sessions (0)" |
| 4 | Preview pane | Shows "No sessions found" message |
| 5 | Press `Esc` | Search cleared, all sessions back |

**Result**: [ ] PASS / [ ] FAIL

---

### TC-M008 | Existing CLI subcommands still work (REGRESSION)

**Priority**: MEDIUM | **Type**: REGRESSION

**Pre**: claude-sessions installed; at least one session exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `claude-sessions list --all --limit 3` | Table output with 3 sessions |
| 2 | Run `claude-sessions search "auth" --all --limit 2` | Matched sessions listed |
| 3 | Run `claude-sessions show <session-id>` | Session details printed |
| 4 | Run `claude-sessions project list` | Projects table printed |
| 5 | Run `claude-sessions tag <session-id> regression-test` | "Tagged <id> with: regression-test" |
| 6 | Run `claude-sessions --version` | Prints `0.4.0` (or newer) |

**Result**: [ ] PASS / [ ] FAIL

---

## Backend Validation

### Metadata file schema

After performing tag/project operations, verify the sidecar file schema:

```bash
cat ~/.claude-sessions/metadata.json | python3 -m json.tool
```

Expected structure:
```json
{
  "version": 1,
  "sessions": {
    "<session-id>": {
      "tags": ["..."]
    }
  },
  "projects": {
    "<project-name>": {
      "sessions": ["<session-id>"],
      "created": "<ISO date>"
    }
  }
}
```

### Read-only guarantee

The tool must never write to `~/.claude/`:

```bash
# Before running claude-sessions
find ~/.claude/projects -name "*.jsonl" -newer /tmp/marker 2>/dev/null
touch /tmp/marker

# Run claude-sessions, do tag/project/etc operations, quit

# After - no JSONL should be newer than marker
find ~/.claude/projects -name "*.jsonl" -newer /tmp/marker
```

Expected: empty output (no files modified).

---

## Cross-Terminal Compatibility

Run the TUI in each of these environments and verify no broken characters:

| Terminal | Status |
|----------|--------|
| GNOME Terminal (Linux) | [ ] |
| iTerm2 (macOS) | [ ] |
| Terminal.app (macOS) | [ ] |
| Windows Terminal | [ ] |
| tmux / screen | [ ] |
| VS Code integrated terminal | [ ] |

---

## Test Execution Log

| Date | Tester | Version | Pass | Fail | Skipped | Notes |
|------|--------|---------|------|------|---------|-------|
| | | v0.4.0 | / 25 | / 25 | / 25 | |

---

## Known Limitations (Not Bugs)

- TUI does not support horizontal splitting (3 panes only, fixed layout)
- Minimum terminal size: ~100×30. Below this, panes may render cramped.
- No undo for tag removal or project session removal
- Help overlay closes on ANY key press, not just Esc/q
