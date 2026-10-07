# Agent Skills (OpenCode)

This project uses skills installed under `.opencode/skills/` (or a compatible path).

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.opencode/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.

## Intent → Skill Mapping

Map the user's intent to the matching skill automatically:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation` and `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`

## Authorization (MANDATORY)

- Answering a question never authorizes a change. Explaining, reviewing, auditing, or discussing past work is read-only: do not create, edit, delete, move, commit, push, or run any mutating command as a side effect of an answer.
- No file, document, or repository modification happens without the user's explicit authorization for that specific action.
- When a fix, correction, or follow-up seems obvious, do NOT apply it. Finish the answer, then ask whether the user wants it done, and wait for confirmation.
- This rule takes precedence over any workflow default (including automatic tracking or follow-up commits): when in doubt, ask and remain read-only.

## Execution Model

For every request:

1. Determine if any skill applies (even a small chance).
2. Load the skill with `skill({ name: "<skill-name>" })`.
3. Follow the skill workflow exactly.
4. Only proceed to implementation once required steps are complete.
