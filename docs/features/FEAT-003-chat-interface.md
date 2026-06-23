# Feature: Chat Interface

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/chat-interface`

## Summary

The primary user-facing screen. Forked from codex-mobile's chat UI (streaming, threads, code blocks), with the bridge layer (`codexAppServerBridge.ts`) replaced by `gateway.ts` connecting to our Express backend. Thread management with sidebar navigation and model selection.

## UI/UX Screens

### Screen 1: Main Chat View

**Route:** `/` and `/thread/:id`
**Component:** `ChatView.vue`

```
+------+----------------------------------+
|      | Model: [v Auto (Nemotron 3)]     |
| Thrd |----------------------------------|
| List |                                  |
|      |  User: How do I reverse a list?  |
| [+]  |                                  |
|      |  Assistant: (streaming...)       |
| T1 * |  ```python                       |
| T2   |  reversed_list = my_list[::-1]   |
| T3   |  ```                             |
|      |  You can also use..._            |
|      |                                  |
|      |----------------------------------|
|      | [Type a message...        ] [->] |
|      | [Attach] [Tools]                 |
+------+----------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `ChatView.vue` | `src/frontend/src/components/chat/ChatView.vue` | Main chat page container |
| `MessageBubble.vue` | `src/frontend/src/components/chat/MessageBubble.vue` | User/assistant message bubble |
| `StreamingResponse.vue` | `src/frontend/src/components/chat/StreamingResponse.vue` | SSE streaming display with cursor |
| `ChatInput.vue` | `src/frontend/src/components/chat/ChatInput.vue` | Multi-line input with auto-resize |
| `CodeBlock.vue` | `src/frontend/src/components/chat/CodeBlock.vue` | Syntax-highlighted code with copy button |

**Interactions:**
- Enter sends message, Shift+Enter adds newline
- Messages stream token-by-token via SSE (`POST /api/chat/completions` with `stream: true`)
- [Stop] button cancels active stream (AbortController)
- Code blocks: syntax highlighting via highlight.js, [Copy] button
- Markdown rendering: headings, lists, tables, inline code
- Loading state: typing indicator animation during response generation
- Error state: shows which providers failed and suggested recovery actions

### Screen 2: Thread Sidebar

**Component:** `ThreadSidebar.vue` (left panel)

```
+--------------+
| Threads    [+]|
|--------------|
| * Reverse... | <- active thread
|   Docker se..|
|   Auth flow  |
|--------------|
| Yesterday     |
|   CSS grid    |
|   SQL query   |
|--------------|
| [Search]      |
+--------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `ThreadSidebar.vue` | `src/frontend/src/components/chat/ThreadSidebar.vue` | Collapsible sidebar |
| `ThreadItem.vue` | `src/frontend/src/components/chat/ThreadItem.vue` | Single thread row |

**Interactions:**
- Click thread: navigate to `/thread/:id`, load messages
- [+] creates new thread, auto-generates title from first message
- Right-click context menu: Rename, Archive, Delete
- Search bar filters threads by title/content
- Threads grouped by date (Today, Yesterday, This Week, Older)
- Active thread highlighted
- Sidebar collapsible on mobile (hamburger menu)

### Screen 3: Model Selector

**Component:** `ModelSelector.vue` (dropdown in header)

```
+--------------------------------+
| Select Model               X  |
+--------------------------------+
| [*] Recommended                |
|   Auto (best available)        |
|                                |
| [*] Free Providers             |
|   Nemotron 3 Super  280ms 99% |
|   Zen Default       340ms 98% |
|   Llama 3.3 70B     420ms 96% |
|                                |
| [K] Your Keys                  |
|   GPT-4o (OpenAI)              |
|   Claude Sonnet (Anthropic)    |
|                                |
| [R] Via Routers                |
|   9Router (40 providers)       |
+--------------------------------+
```

**Interactions:**
- Models grouped by source: Recommended, Free Providers, Your Keys, Via Routers
- Each model row shows: name, provider icon, health dot, average latency
- "Auto" option uses orchestrator's composite scoring to select best model
- Selection persisted per thread (stored in threads table)
- Custom dropdown component (no native select per AGENTS.md rules)

### Screen 4: Empty State

**Route:** `/` with no threads
**Component:** `ChatView.vue` (empty variant)

```
+------+----------------------------------+
|      |                                  |
| No   |         Codex                    |
| thrd |                                  |
|      |  Start a new conversation        |
|      |                                  |
|      |  [Reverse a list in Python]      |
|      |  [Explain Docker networking]     |
|      |  [Debug this SQL query]          |
|      |                                  |
|      |  Model: [v Auto (best)]          |
|      |                                  |
|      |----------------------------------|
|      | [Type a message...        ] [->] |
+------+----------------------------------+
```

**Interactions:**
- Quick-start suggestion cards: clicking one pre-fills the composer
- Model selector inline
- First message creates a new thread and starts streaming

## Acceptance Criteria

- [ ] Messages stream token-by-token via SSE (no buffering full response)
- [ ] Thread list shows all user's threads grouped by date
- [ ] New thread auto-selects best available model via orchestrator
- [ ] Model selector shows health/latency per model, grouped by source
- [ ] Code blocks have syntax highlighting (highlight.js) and copy button
- [ ] Chat persists to SQLite, survives page refresh
- [ ] Mobile responsive (375px minimum width, collapsible sidebar)
- [ ] [Stop] button cancels active stream
- [ ] Thread title auto-generated from first user message
- [ ] Dark theme first, light theme toggle

## Implementation Notes

- `gateway.ts` replaces `codexAppServerBridge.ts`: all calls go to Express backend at `VITE_BACKEND_URL`
- Chat streaming: `POST /api/chat/completions` with `stream: true`, frontend reads via `fetch()` + `ReadableStream`
- Thread CRUD: `GET/POST/PATCH/DELETE /api/threads`, `GET/POST /api/threads/:id/messages`
- Message virtualization: `vue-virtual-scroller` for threads with 100+ messages
- Markdown: `marked` or `markdown-it` (already in codex-mobile)
- Syntax highlighting: `highlight.js` (already in codex-mobile)

## Test Coverage

- Unit: `tests/unit/frontend/components/chat/ChatView.test.ts`
- Unit: `tests/unit/frontend/components/chat/ChatInput.test.ts`
- Unit: `tests/unit/frontend/components/chat/ModelSelector.test.ts`
- Unit: `tests/unit/frontend/api/gateway.test.ts`
- Unit: `tests/unit/backend/api/chat.routes.test.ts`
- Integration: `tests/integration/chat/streaming.test.ts`
- E2E: `tests/e2e/chat/conversation.spec.ts`
