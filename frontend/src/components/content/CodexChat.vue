<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { api, type ApiThread, type ApiMessage, type ApiModel } from '../../api/codexBackend'
import IconTablerMessages from '../icons/IconTablerMessages.vue'
import IconTablerX from '../icons/IconTablerX.vue'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import IconTablerTrash from '../icons/IconTablerTrash.vue'

// ── state ──────────────────────────────────────────────────────────────────────

const threads = ref<ApiThread[]>([])
const activeThreadId = ref<string | null>(null)
const messages = ref<ApiMessage[]>([])
const streamingContent = ref('')
const isStreaming = ref(false)
const input = ref('')
const errorMsg = ref('')
const selectedModel = ref('')
const availableModels = ref<ApiModel[]>([])
const backendAvailable = ref(true)

const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const editingThreadId = ref<string | null>(null)
const editingTitle = ref('')
let streamAbort: AbortController | null = null

// ── computed ───────────────────────────────────────────────────────────────────

const activeThread = computed(() => threads.value.find(t => t.id === activeThreadId.value) ?? null)

// ── lifecycle ──────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadThreads(), loadModels()])
  if (threads.value.length) activeThreadId.value = threads.value[0]!.id
})

watch(activeThreadId, async (id) => {
  messages.value = []
  if (!id) return
  try {
    messages.value = await api.messages.list(id)
  } catch { /* empty is fine */ }
  nextTick(scrollToBottom)
})

watch([messages, streamingContent], () => { nextTick(scrollToBottom) }, { flush: 'post' })

// ── data loading ───────────────────────────────────────────────────────────────

async function loadThreads() {
  try {
    threads.value = await api.threads.list()
    backendAvailable.value = true
  } catch {
    backendAvailable.value = false
    errorMsg.value = 'Backend not reachable — start the server on :3001'
  }
}

async function loadModels() {
  try {
    const models = await api.models.list()
    availableModels.value = models
    if (models.length && !selectedModel.value) selectedModel.value = models[0]!.id
  } catch { /* models optional */ }
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

function scrollToBottom() {
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

function autoGrow() {
  if (!textareaEl.value) return
  textareaEl.value.style.height = 'auto'
  textareaEl.value.style.height = Math.min(textareaEl.value.scrollHeight, 200) + 'px'
}

// ── thread actions ─────────────────────────────────────────────────────────────

async function createThread(title?: string) {
  try {
    const t = await api.threads.create(title ?? 'New chat')
    threads.value.unshift(t)
    activeThreadId.value = t.id
    messages.value = []
    return t
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to create thread'
    return null
  }
}

async function deleteThread(id: string, e: Event) {
  e.stopPropagation()
  if (!confirm('Delete this conversation?')) return
  try {
    await api.threads.delete(id)
    threads.value = threads.value.filter(t => t.id !== id)
    if (activeThreadId.value === id) {
      activeThreadId.value = threads.value[0]?.id ?? null
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Delete failed'
  }
}

function startEditTitle(thread: ApiThread, e: Event) {
  e.stopPropagation()
  editingThreadId.value = thread.id
  editingTitle.value = thread.title
  nextTick(() => {
    document.getElementById(`title-edit-${thread.id}`)?.focus()
  })
}

async function saveTitle(id: string) {
  const title = editingTitle.value.trim()
  editingThreadId.value = null
  if (!title) return
  try {
    const updated = await api.threads.update(id, { title })
    const idx = threads.value.findIndex(t => t.id === id)
    if (idx >= 0) threads.value[idx] = updated
  } catch { /* silently fail */ }
}

// ── message sending ────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isStreaming.value) return

  input.value = ''
  errorMsg.value = ''
  nextTick(autoGrow)

  // Ensure we have a thread
  let threadId = activeThreadId.value
  if (!threadId) {
    const t = await createThread(text.slice(0, 60))
    if (!t) return
    threadId = t.id
  }

  // Optimistic user message
  const optimisticId = crypto.randomUUID()
  messages.value = [...messages.value, {
    id: optimisticId, threadId, role: 'user', content: text,
    ts: new Date().toISOString(),
  }]

  // Persist user message
  try {
    const saved = await api.messages.create(threadId, { role: 'user', content: text })
    messages.value = messages.value.map(m => m.id === optimisticId ? saved : m)
  } catch { /* keep optimistic */ }

  // Stream assistant reply
  isStreaming.value = true
  streamingContent.value = ''
  streamAbort = new AbortController()

  const chatHistory = messages.value.map(m => ({ role: m.role, content: m.content }))

  try {
    for await (const chunk of api.stream(chatHistory, selectedModel.value || undefined, streamAbort.signal)) {
      streamingContent.value += chunk
    }
    if (streamingContent.value) {
      const assistantContent = streamingContent.value
      streamingContent.value = ''
      const saved = await api.messages.create(threadId, {
        role: 'assistant',
        content: assistantContent,
        modelId: selectedModel.value || undefined,
      })
      messages.value = [...messages.value, saved]
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // User stopped — save partial if any
      if (streamingContent.value) {
        const partial = streamingContent.value
        streamingContent.value = ''
        const saved = await api.messages.create(threadId, {
          role: 'assistant', content: partial, modelId: selectedModel.value || undefined,
        }).catch(() => null)
        if (saved) messages.value = [...messages.value, saved]
      }
    } else {
      errorMsg.value = e instanceof Error ? e.message : 'Stream error'
      streamingContent.value = ''
    }
  } finally {
    streamAbort = null
    isStreaming.value = false
  }
}

function stopStream() {
  streamAbort?.abort()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// ── markdown renderer ──────────────────────────────────────────────────────────

function renderMarkdown(raw: string): string {
  // Escape HTML
  let text = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Stash fenced code blocks before any other transforms
  const codeBlocks: string[] = []
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length
    codeBlocks.push(
      `<div class="message-code-block">` +
      (lang ? `<div class="message-code-language">${lang}</div>` : '') +
      `<pre class="message-code-pre"><code>${code.trimEnd()}</code></pre></div>`
    )
    return `\x00CODEBLOCK${i}\x00`
  })

  // Headings
  text = text
    .replace(/^#### (.+)$/gm, '<h5 class="message-heading message-heading-h5">$1</h5>')
    .replace(/^### (.+)$/gm, '<h4 class="message-heading message-heading-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="message-heading message-heading-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="message-heading message-heading-h2">$1</h2>')

  // Horizontal rule
  text = text.replace(/^---+$/gm, '<hr class="message-divider">')

  // Inline code (must come before bold/italic)
  text = text.replace(/`([^`\n]+)`/g, '<code class="message-inline-code">$1</code>')

  // Bold + italic combos
  text = text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="message-bold-text"><em class="message-italic-text">$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="message-bold-text">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="message-bold-text">$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em class="message-italic-text">$1</em>')
    .replace(/_([^_\n]+?)_/g, '<em class="message-italic-text">$1</em>')

  // Unordered lists (simple — contiguous - lines)
  text = text.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li class="message-list-item">${l.replace(/^[ \t]*[-*+] /, '')}</li>`).join('')
    return `<ul class="message-list message-list-unordered">${items}</ul>`
  })

  // Ordered lists
  text = text.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li class="message-list-item">${l.replace(/^[ \t]*\d+\. /, '')}</li>`).join('')
    return `<ol class="message-list message-list-ordered">${items}</ol>`
  })

  // Paragraphs: split on blank lines, wrap non-html blocks in <p>
  const blocks = text.split(/\n{2,}/)
  text = blocks.map(block => {
    block = block.trim()
    if (!block) return ''
    if (/^\x00CODEBLOCK\d+\x00$/.test(block)) return codeBlocks[parseInt(block.slice(10, -1))] ?? ''
    if (/^<(h[1-6]|ul|ol|hr|div)/.test(block)) return block
    return `<p class="message-text">${block.replace(/\n/g, '<br>')}</p>`
  }).filter(Boolean).join('\n')

  // Restore any inline code blocks (if they survived paragraph splitting)
  text = text.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => codeBlocks[parseInt(i)] ?? '')

  return text
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function copyMessage(content: string) {
  await navigator.clipboard.writeText(content).catch(() => {})
}
</script>

<template>
  <div class="codex-chat-root">

    <!-- ── Thread list panel ───────────────────────────────────────────────── -->
    <aside class="codex-chat-aside">
      <div class="codex-chat-aside-header">
        <button class="codex-chat-new-btn" type="button" @click="createThread()">
          <span class="codex-chat-new-btn-icon">＋</span>
          New chat
        </button>
      </div>

      <div class="codex-chat-thread-list" role="listbox" aria-label="Conversations">
        <!-- backend offline notice -->
        <div v-if="!backendAvailable" class="codex-chat-offline">
          Backend offline
        </div>

        <template v-else>
          <button
            v-for="thread in threads"
            :key="thread.id"
            class="codex-chat-thread-item"
            :class="{ 'is-active': thread.id === activeThreadId }"
            role="option"
            :aria-selected="thread.id === activeThreadId"
            type="button"
            @click="activeThreadId = thread.id"
          >
            <!-- inline title edit -->
            <template v-if="editingThreadId === thread.id">
              <input
                :id="`title-edit-${thread.id}`"
                v-model="editingTitle"
                class="codex-chat-title-input"
                @blur="saveTitle(thread.id)"
                @keydown.enter.prevent="saveTitle(thread.id)"
                @keydown.esc.prevent="editingThreadId = null"
                @click.stop
              />
            </template>
            <template v-else>
              <span
                class="codex-chat-thread-title"
                :title="thread.title"
                @dblclick.stop="startEditTitle(thread, $event)"
              >{{ thread.title }}</span>
              <button
                class="codex-chat-thread-delete"
                type="button"
                :title="'Delete conversation'"
                @click="deleteThread(thread.id, $event)"
              >
                <IconTablerX />
              </button>
            </template>
          </button>

          <div v-if="threads.length === 0" class="codex-chat-no-threads">
            No conversations yet
          </div>
        </template>
      </div>
    </aside>

    <!-- ── Chat main area ─────────────────────────────────────────────────── -->
    <main class="codex-chat-main">

      <!-- welcome / empty state -->
      <template v-if="!activeThreadId">
        <div class="codex-chat-welcome">
          <span class="codex-chat-welcome-icon" aria-hidden="true">
            <IconTablerMessages />
          </span>
          <p class="codex-chat-welcome-title">Start a conversation</p>
          <p class="codex-chat-welcome-subtitle">Type a message below or create a new chat</p>
        </div>
      </template>

      <!-- message list -->
      <template v-else>
        <div class="conversation-root codex-chat-scroll" ref="scrollEl">
          <ul class="conversation-list">
            <li
              v-for="msg in messages"
              :key="msg.id"
              class="conversation-item"
              :data-role="msg.role"
            >
              <div class="message-row">
                <div class="message-stack">
                  <div class="message-body" :data-role="msg.role">
                    <div class="message-card" :data-role="msg.role">
                      <div class="message-text-flow" v-html="renderMarkdown(msg.content)" />
                    </div>
                    <!-- message meta: time + copy -->
                    <div class="codex-chat-msg-meta">
                      <span class="codex-chat-msg-time">{{ formatTime(msg.ts) }}</span>
                      <span v-if="msg.modelId" class="codex-chat-msg-model">{{ msg.modelId }}</span>
                      <button
                        class="codex-chat-copy-btn"
                        type="button"
                        title="Copy"
                        @click="copyMessage(msg.content)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <!-- streaming assistant message -->
            <li v-if="isStreaming" class="conversation-item" data-role="assistant">
              <div class="message-row">
                <div class="message-stack">
                  <div class="message-body" data-role="assistant">
                    <div class="message-card" data-role="assistant">
                      <div
                        v-if="streamingContent"
                        class="message-text-flow"
                        v-html="renderMarkdown(streamingContent)"
                      />
                      <div v-else class="codex-chat-typing" aria-label="Thinking">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <!-- ── Composer ──────────────────────────────────────────────────────── -->
      <form class="thread-composer codex-chat-composer" @submit.prevent="sendMessage">
        <div
          class="thread-composer-shell"
          :class="{ 'thread-composer-shell--no-top-radius': !!activeThreadId }"
        >
          <div class="thread-composer-input-wrap">
            <textarea
              ref="textareaEl"
              class="thread-composer-input"
              v-model="input"
              :placeholder="activeThreadId ? 'Message… (Enter to send, Shift+Enter for newline)' : 'Start a new conversation…'"
              rows="1"
              :disabled="!backendAvailable"
              @keydown="onKeydown"
              @input="autoGrow"
            />
          </div>
          <div class="thread-composer-controls">
            <!-- model selector -->
            <select
              v-if="availableModels.length"
              v-model="selectedModel"
              class="codex-chat-model-select"
              :disabled="isStreaming"
              :title="'Model'"
            >
              <option v-for="m in availableModels" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>

            <!-- stop button (streaming) -->
            <button
              v-if="isStreaming"
              class="codex-chat-stop-btn"
              type="button"
              title="Stop"
              @click="stopStream"
            >
              <IconTablerPlayerStopFilled />
            </button>

            <!-- send button -->
            <button
              v-else
              class="codex-chat-send-btn"
              type="submit"
              :disabled="!input.trim() || !backendAvailable"
              title="Send (Enter)"
            >
              <IconTablerArrowUp />
            </button>
          </div>
        </div>

        <!-- error bar -->
        <div v-if="errorMsg" class="codex-chat-error-bar" role="alert">
          <span>{{ errorMsg }}</span>
          <button class="codex-chat-error-close" type="button" @click="errorMsg = ''">
            <IconTablerX />
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* ── root layout ─────────────────────────────────────────────────────────── */

.codex-chat-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: theme(colors.zinc.50);
}

/* ── thread list aside ───────────────────────────────────────────────────── */

.codex-chat-aside {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: theme(colors.white);
  border-right: 1px solid theme(colors.zinc.200);
  overflow: hidden;
}

.codex-chat-aside-header {
  padding: 10px;
  border-bottom: 1px solid theme(colors.zinc.100);
}

.codex-chat-new-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  background: theme(colors.zinc.900);
  color: theme(colors.white);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.codex-chat-new-btn:hover {
  background: theme(colors.zinc.700);
}

.codex-chat-new-btn-icon {
  font-size: 15px;
  line-height: 1;
}

.codex-chat-thread-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.codex-chat-thread-item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: theme(colors.zinc.600);
  text-align: left;
  background: none;
  border: none;
  transition: background 0.1s;
}

.codex-chat-thread-item:hover {
  background: theme(colors.zinc.100);
  color: theme(colors.zinc.900);
}

.codex-chat-thread-item.is-active {
  background: theme(colors.zinc.100);
  color: theme(colors.zinc.900);
  font-weight: 500;
}

.codex-chat-thread-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.codex-chat-thread-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  opacity: 0;
  color: theme(colors.zinc.400);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  padding: 0;
  transition: opacity 0.1s, color 0.1s;
}

.codex-chat-thread-item:hover .codex-chat-thread-delete {
  opacity: 1;
}

.codex-chat-thread-delete:hover {
  color: theme(colors.rose.500);
}

.codex-chat-title-input {
  flex: 1;
  min-width: 0;
  padding: 2px 4px;
  font-size: 13px;
  border: 1px solid theme(colors.zinc.300);
  border-radius: 4px;
  background: theme(colors.white);
  color: theme(colors.zinc.900);
  outline: none;
}

.codex-chat-title-input:focus {
  border-color: theme(colors.zinc.500);
}

.codex-chat-no-threads,
.codex-chat-offline {
  padding: 12px 8px;
  font-size: 12px;
  color: theme(colors.zinc.400);
  text-align: center;
}

.codex-chat-offline {
  color: theme(colors.rose.500);
}

/* ── main chat area ──────────────────────────────────────────────────────── */

.codex-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.codex-chat-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: theme(colors.zinc.400);
  padding: 24px;
}

.codex-chat-welcome-icon {
  font-size: 40px;
  color: theme(colors.zinc.300);
}

.codex-chat-welcome-title {
  font-size: 16px;
  font-weight: 600;
  color: theme(colors.zinc.500);
}

.codex-chat-welcome-subtitle {
  font-size: 13px;
  color: theme(colors.zinc.400);
}

.codex-chat-scroll {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* ── message meta (time, model, copy) ────────────────────────────────────── */

.codex-chat-msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.conversation-item:hover .codex-chat-msg-meta {
  opacity: 1;
}

.codex-chat-msg-time {
  font-size: 11px;
  color: theme(colors.zinc.400);
}

.codex-chat-msg-model {
  font-size: 10px;
  color: theme(colors.zinc.400);
  background: theme(colors.zinc.100);
  padding: 1px 5px;
  border-radius: 10px;
}

.codex-chat-copy-btn {
  display: flex;
  align-items: center;
  padding: 2px;
  color: theme(colors.zinc.400);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 3px;
  transition: color 0.1s;
}

.codex-chat-copy-btn:hover {
  color: theme(colors.zinc.700);
}

/* ── typing indicator ────────────────────────────────────────────────────── */

.codex-chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.codex-chat-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: theme(colors.zinc.400);
  animation: codex-pulse 1.2s ease-in-out infinite;
}

.codex-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.codex-chat-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes codex-pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ── composer ────────────────────────────────────────────────────────────── */

.codex-chat-composer {
  flex-shrink: 0;
}

.codex-chat-model-select {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid theme(colors.zinc.200);
  background: theme(colors.white);
  color: theme(colors.zinc.700);
  cursor: pointer;
  max-width: 140px;
  outline: none;
}

.codex-chat-model-select:hover {
  border-color: theme(colors.zinc.400);
}

.codex-chat-send-btn,
.codex-chat-stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.codex-chat-send-btn {
  background: theme(colors.zinc.900);
  color: theme(colors.white);
}

.codex-chat-send-btn:hover:not(:disabled) {
  background: theme(colors.zinc.700);
}

.codex-chat-send-btn:disabled {
  background: theme(colors.zinc.200);
  color: theme(colors.zinc.400);
  cursor: not-allowed;
}

.codex-chat-stop-btn {
  background: theme(colors.rose.100);
  color: theme(colors.rose.600);
}

.codex-chat-stop-btn:hover {
  background: theme(colors.rose.200);
}

/* ── error bar ───────────────────────────────────────────────────────────── */

.codex-chat-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: theme(colors.rose.50);
  border-top: 1px solid theme(colors.rose.200);
  font-size: 13px;
  color: theme(colors.rose.700);
}

.codex-chat-error-bar span {
  flex: 1;
}

.codex-chat-error-close {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: theme(colors.rose.400);
  padding: 2px;
}

/* ── dark mode ───────────────────────────────────────────────────────────── */

:root.dark .codex-chat-root {
  background: theme(colors.zinc.950);
}

:root.dark .codex-chat-aside {
  background: theme(colors.zinc.900);
  border-right-color: theme(colors.zinc.800);
}

:root.dark .codex-chat-aside-header {
  border-bottom-color: theme(colors.zinc.800);
}

:root.dark .codex-chat-new-btn {
  background: theme(colors.zinc.700);
  color: theme(colors.zinc.100);
}

:root.dark .codex-chat-new-btn:hover {
  background: theme(colors.zinc.600);
}

:root.dark .codex-chat-thread-item {
  color: theme(colors.zinc.400);
}

:root.dark .codex-chat-thread-item:hover,
:root.dark .codex-chat-thread-item.is-active {
  background: theme(colors.zinc.800);
  color: theme(colors.zinc.100);
}

:root.dark .codex-chat-title-input {
  background: theme(colors.zinc.800);
  border-color: theme(colors.zinc.600);
  color: theme(colors.zinc.100);
}

:root.dark .codex-chat-welcome-icon {
  color: theme(colors.zinc.700);
}

:root.dark .codex-chat-welcome-title {
  color: theme(colors.zinc.400);
}

:root.dark .codex-chat-welcome-subtitle {
  color: theme(colors.zinc.500);
}

:root.dark .codex-chat-msg-model {
  background: theme(colors.zinc.800);
  color: theme(colors.zinc.500);
}

:root.dark .codex-chat-model-select {
  background: theme(colors.zinc.800);
  border-color: theme(colors.zinc.700);
  color: theme(colors.zinc.300);
}

:root.dark .codex-chat-send-btn {
  background: theme(colors.zinc.200);
  color: theme(colors.zinc.900);
}

:root.dark .codex-chat-send-btn:hover:not(:disabled) {
  background: theme(colors.zinc.100);
}

:root.dark .codex-chat-send-btn:disabled {
  background: theme(colors.zinc.800);
  color: theme(colors.zinc.600);
}

:root.dark .codex-chat-error-bar {
  background: theme(colors.rose.950);
  border-top-color: theme(colors.rose.900);
  color: theme(colors.rose.300);
}

:root.dark .codex-chat-typing span {
  background: theme(colors.zinc.500);
}
</style>
