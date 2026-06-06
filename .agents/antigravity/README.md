# Antigravity Skills for Textile POS

Welcome, Antigravity Agent! This directory contains specialized skills and workflows tailored for the Textile POS project. 

As an Antigravity Agent, you have unique capabilities compared to standard AI assistants:
- **Autonomous Execution**: You can run shell commands, manage background tasks, and spawn subagents.
- **Planning Mode**: You use `implementation_plan.md`, `task.md`, and `walkthrough.md` for major changes.
- **Artifacts**: You create rich markdown artifacts for the user.

## Core Directives for Antigravity
1. **Always read `AGENTS.md` and `CLAUDE.md`** before starting any work to understand the business rules (roll-based inventory, decimal-safe math, append-only ledgers, etc.).
2. **Utilize Subagents**: If a task involves extensive research (e.g., finding all usages of a component) or parallel work, use `invoke_subagent` to spawn a `research` or `self` subagent.
3. **Manage Background Tasks**: When starting the frontend or backend servers for testing, use `run_command` with `WaitMsBeforeAsync` to send them to the background, and use `manage_task` to monitor or kill them.
4. **Follow the Planning Workflow**: For new features (milestones), always enter Planning Mode: research, create an `implementation_plan.md` artifact, request user feedback, and then execute.

## Available Skills
The following skills are available in the `skills/` directory. Use them when requested by the user:

- `milestone.md`: End-to-end implementation of a new feature milestone.
- `nestjs-module.md`: Scaffolding a new NestJS module.
- `prisma-migration.md`: Creating and managing database migrations.
- `project-review.md`: Auditing code against project rules.
- `run-textile-pos.md`: Starting the application and testing flows.
