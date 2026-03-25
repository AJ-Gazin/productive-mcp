# Productive.io MCP Server

An MCP (Model Context Protocol) server for interacting with Productive.io — time tracking, task management, projects, and more. Built for Claude Code.

## Setup

### 1. Clone and build

```bash
git clone https://github.com/AJ-Gazin/productive-mcp.git
cd productive-mcp
npm install
npx tsc
```

### 2. Get your Productive.io credentials

You need three values:

| Credential | Where to find it |
|---|---|
| **API Token** | Productive.io → Settings → API integrations → Generate token |
| **Organization ID** | Ask your admin, or check any Productive API response |
| **User ID** | Ask Claude to look it up after setup (using your email), or check the URL when viewing your profile |

### 3. Add to Claude Code

From your project directory, run:

```bash
claude mcp add productive -s project \
  -e PRODUCTIVE_API_TOKEN=your_token \
  -e PRODUCTIVE_ORG_ID=your_org_id \
  -e PRODUCTIVE_USER_ID=your_user_id \
  -- node /absolute/path/to/productive-mcp/build/index.js
```

Replace `/absolute/path/to/productive-mcp` with wherever you cloned the repo.

The `-s project` flag scopes the MCP server to the current directory only. Omit it to make it available globally.

### 4. Restart Claude Code

The MCP server loads on startup. After adding it, restart Claude Code and verify with:

```
/productive list my projects
```

## Available Tools

### Time Tracking
- `list_time_entries` — view logged time (filter by date, person, project, task, service)
- `create_time_entry` — log new time entries
- `update_time_entry` — update an existing time entry (only unsubmitted/unapproved)
- `delete_time_entry` — delete an existing time entry (only unsubmitted/unapproved)
- `get_project_services` — get services for a project (needed for time entries)
- `list_services` — list all services in the org

### Task Management
- `list_tasks` / `get_task` / `get_project_tasks` / `my_tasks` — view tasks
- `create_task` — create new tasks
- `update_task_status` — change task status
- `update_task_assignment` — reassign tasks
- `update_task_details` — edit task details
- `add_task_comment` — comment on tasks
- `update_task_sprint` — assign tasks to sprints
- `move_task_to_list` / `add_to_backlog` / `reposition_task` — organize tasks

### Projects & Organization
- `list_projects` / `list_companies` — browse projects and companies
- `list_boards` / `create_board` — manage project boards
- `list_task_lists` / `create_task_list` — manage task lists
- `list_workflow_statuses` — see available task status options

### Activity
- `list_activities` / `get_recent_updates` — view recent changes
- `whoami` — check current user context

## Claude Code Skill

This repo includes a Claude Code skill at `.claude/skills/productive/SKILL.md`. It provides guided workflows for time tracking and other operations. If you clone this repo into your project, the `/productive` slash command becomes available automatically.

## Updating

```bash
cd /path/to/productive-mcp
git pull
npm install
npx tsc
```

Then restart Claude Code.

## License

ISC
