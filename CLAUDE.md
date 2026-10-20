# CLAUDE.md

## Required: document all dev work in the Notion "DEV Dashboard"

All coding/development work in this repo must be recorded in Chris's Notion
database **DEV Dashboard**
(https://app.notion.com/p/27e8a3525c8e4a4797a0112525de73ee). It is the shared
project memory between Chris, Claude, ChatGPT and other agents.

Whenever a session makes meaningful progress (code change, deploy, config or
database change, important decision, or a finding that changes the plan):

1. **Find the project's existing entry first** and update it. Never create a
   duplicate because the wording differs. Create a new entry (Stage =
   Project) only for a genuinely new project.
2. **Notes**: append a dated entry (`YYYY-MM-DD (Claude): ...`) covering what
   changed, PR links, what was deployed (version IDs), what was tested vs.
   not tested, and decisions made. Preserve existing notes.
3. **Next Step**: the smallest useful next action (something Chris can start
   in 5–10 minutes).
4. **Last Worked On** = today, **Last Worked By** = Claude; update
   **Status**/**Stage** when warranted. Never mark Completed just because a
   session ended.
5. For significant changes, keep the "how it works" write-up in the
   project page body current, so another agent can pick it up cold.

Do this before ending the session, not only when asked.

## Projects in this repo

| Path | DEV Dashboard entry |
| --- | --- |
| `cloudflare/septa-consist-logger/` | Consist Logger (https://app.notion.com/p/3e42e27a7ab9818fa8a6ce2fcfcb9ef4) |
| `cloudflare/septa-next-trains-proxy/`, `docs/apps/` | Search the DEV Dashboard for the matching project |
