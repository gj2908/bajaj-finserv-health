<template>
  <div class="app">

    <!-- Background mesh -->
    <div class="bg-mesh" aria-hidden="true">
      <div class="mesh-orb orb-1"></div>
      <div class="mesh-orb orb-2"></div>
      <div class="mesh-orb orb-3"></div>
    </div>

    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="logo">
          <svg class="logo-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text">BFHL<span class="logo-sub">Analyser</span></span>
        </div>
        <span :class="['badge-status', apiOk === null ? 'badge-checking' : apiOk ? 'badge-ok' : 'badge-err']">
          <span class="dot"></span>
          {{ apiOk === null ? 'Checking' : apiOk ? 'API Online' : 'API Offline' }}
        </span>
      </div>
    </header>

    <!-- Main -->
    <main class="main">

      <!-- Input card -->
      <section class="card input-card">
        <div class="card-header">
          <IconTerminal class="card-icon" />
          <h2 class="card-title">Input Data</h2>
          <span class="card-hint">Comma-separated directed edges &mdash; e.g. <code>A-&gt;B, B-&gt;C</code></span>
        </div>

        <div class="input-group">
          <textarea
            id="data-input"
            v-model="rawInput"
            class="textarea"
            rows="5"
            spellcheck="false"
            placeholder="A->B, A->C, B->D, G->H, H->G, X->invalid ..."
            :disabled="loading"
            @keydown.ctrl.enter="submit"
          ></textarea>
          <div class="input-meta">
            <span class="char-count">{{ tokenCount }} token{{ tokenCount !== 1 ? 's' : '' }}</span>
            <span class="hint-kbd">Ctrl + Enter to submit</span>
          </div>
        </div>

        <div class="btn-row">
          <button id="btn-analyse" class="btn btn-primary" :disabled="loading || !rawInput.trim()" @click="submit">
            <IconPlay v-if="!loading" />
            <span v-if="!loading">Analyse</span>
            <span v-else class="spinner"></span>
          </button>
          <button id="btn-example" class="btn btn-ghost" :disabled="loading" @click="loadExample">
            <IconFlash />
            Load Example
          </button>
          <button id="btn-clear" class="btn btn-ghost" :disabled="loading || !result" @click="clearAll">
            <IconTrash />
            Clear
          </button>
        </div>

        <div v-if="error" class="alert alert-error">
          <IconAlert />
          {{ error }}
        </div>
      </section>

      <!-- Results -->
      <transition name="slide-up">
        <section v-if="result" class="results-grid">

          <!-- Identity -->
          <div class="card identity-card">
            <div class="card-header">
              <IconId class="card-icon" />
              <h3 class="card-title">Identity</h3>
            </div>
            <dl class="kv-list">
              <div class="kv">
                <dt>User ID</dt>
                <dd><code>{{ result.user_id }}</code></dd>
              </div>
              <div class="kv">
                <dt>Email</dt>
                <dd><code>{{ result.email_id }}</code></dd>
              </div>
              <div class="kv">
                <dt>Roll Number</dt>
                <dd><code>{{ result.college_roll_number }}</code></dd>
              </div>
            </dl>
          </div>

          <!-- Summary -->
          <div class="card summary-card">
            <div class="card-header">
              <IconChart class="card-icon" />
              <h3 class="card-title">Summary</h3>
            </div>
            <div class="stats-row">
              <div class="stat">
                <span class="stat-value text-green">{{ result.summary.total_trees }}</span>
                <span class="stat-label">Trees</span>
              </div>
              <div class="stat">
                <span class="stat-value text-red">{{ result.summary.total_cycles }}</span>
                <span class="stat-label">Cycles</span>
              </div>
              <div class="stat">
                <span class="stat-value text-accent">{{ result.summary.largest_tree_root ?? '—' }}</span>
                <span class="stat-label">Largest Root</span>
              </div>
            </div>
          </div>

          <!-- Invalid entries -->
          <div v-if="result.invalid_entries.length" class="card tag-card">
            <div class="card-header">
              <IconBan class="card-icon icon-red" />
              <h3 class="card-title">Invalid Entries</h3>
              <span class="badge-count badge-red">{{ result.invalid_entries.length }}</span>
            </div>
            <div class="tag-cloud">
              <span v-for="e in result.invalid_entries" :key="e" class="tag tag-red">{{ e }}</span>
            </div>
          </div>

          <!-- Duplicates -->
          <div v-if="result.duplicate_edges.length" class="card tag-card">
            <div class="card-header">
              <IconDuplicate class="card-icon icon-yellow" />
              <h3 class="card-title">Duplicate Edges</h3>
              <span class="badge-count badge-yellow">{{ result.duplicate_edges.length }}</span>
            </div>
            <div class="tag-cloud">
              <span v-for="e in result.duplicate_edges" :key="e" class="tag tag-yellow">{{ e }}</span>
            </div>
          </div>

          <!-- Hierarchies -->
          <div class="card hierarchies-card">
            <div class="card-header">
              <IconTree class="card-icon" />
              <h3 class="card-title">Hierarchies</h3>
              <span class="badge-count">{{ result.hierarchies.length }}</span>
            </div>

            <div v-if="!result.hierarchies.length" class="empty-state">
              No hierarchies found for the given input.
            </div>

            <div v-else class="hierarchy-list">
              <div
                v-for="h in result.hierarchies"
                :key="h.root"
                :class="['hierarchy-item', h.has_cycle ? 'cycle-item' : 'tree-item']"
              >
                <div class="hierarchy-header">
                  <span :class="['h-dot', h.has_cycle ? 'h-dot-red' : 'h-dot-green']"></span>
                  <span class="h-root">Root: <strong>{{ h.root }}</strong></span>
                  <span :class="['h-badge', h.has_cycle ? 'h-badge-cycle' : 'h-badge-tree']">
                    {{ h.has_cycle ? 'CYCLE' : `DEPTH ${h.depth}` }}
                  </span>
                </div>

                <div v-if="!h.has_cycle && h.tree && hasChildren(h.tree)" class="tree-viz">
                  <TreeNode :node="h.tree" :depth="0" />
                </div>
                <div v-else-if="h.has_cycle" class="cycle-msg">
                  Cycle detected — linear traversal unavailable for this group.
                </div>
              </div>
            </div>
          </div>

          <!-- Raw JSON -->
          <div class="card json-card">
            <div class="card-header">
              <IconCode class="card-icon" />
              <h3 class="card-title">Raw Response</h3>
              <button id="btn-copy" class="btn-copy" @click="copyJson">
                {{ copied ? 'Copied' : 'Copy JSON' }}
              </button>
            </div>
            <pre class="json-pre"><code>{{ prettyJson }}</code></pre>
          </div>

        </section>
      </transition>

    </main>

    <footer class="footer">
      <p>BFHL Full-Stack Challenge &mdash; SRM Institute of Science &amp; Technology &mdash; 2025</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TreeNode from './components/TreeNode.vue'

// ── Inline icons (Heroicons / custom SVG) ─────────────────────────────────────

const IconTerminal = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
  </svg>`
}

const IconPlay = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`
}

const IconFlash = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`
}

const IconTrash = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>`
}

const IconAlert = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`
}

const IconId = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/>
    <path d="M14 10h4"/><path d="M14 14h4"/>
  </svg>`
}

const IconChart = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>`
}

const IconBan = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>`
}

const IconDuplicate = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/>
  </svg>`
}

const IconTree = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"/><path d="M5 9l7-7 7 7"/><path d="M5 15l7-7 7 7"/>
  </svg>`
}

const IconCode = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`
}

// ── Configuration ──────────────────────────────────────────────────────────
const rawApiUrl = import.meta.env.VITE_API_URL || ''
const API_BASE = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

// ── State ──────────────────────────────────────────────────────────────────
const rawInput = ref('')
const loading  = ref(false)
const error    = ref('')
const result   = ref(null)
const apiOk    = ref(null)
const copied   = ref(false)

// ── Computed ──────────────────────────────────────────────────────────────────
const tokenCount = computed(() =>
  rawInput.value.split(',').map(s => s.trim()).filter(Boolean).length
)

const prettyJson = computed(() =>
  result.value ? JSON.stringify(result.value, null, 2) : ''
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasChildren(obj) {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0
}

// ── Health check ──────────────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    apiOk.value = res.ok
  } catch {
    apiOk.value = false
  }
}

onMounted(checkHealth)

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  if (!rawInput.value.trim()) return
  error.value  = ''
  result.value = null
  loading.value = true

  const tokens = rawInput.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  try {
    const res = await fetch(`${API_BASE}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: tokens }),
    })
    const json = await res.json()

    if (!res.ok || !json.is_success) {
      throw new Error(json.error || `HTTP ${res.status}`)
    }
    result.value = json
  } catch (e) {
    error.value = e.message || 'Network error — is the backend running on port 3000?'
  } finally {
    loading.value = false
  }
}

// ── Example ───────────────────────────────────────────────────────────────────
function loadExample() {
  rawInput.value = 'A->B, A->C, B->D, B->E, C->F, G->H, H->G, X->invalid, A->B'
  error.value    = ''
  result.value   = null
}

// ── Clear ─────────────────────────────────────────────────────────────────────
function clearAll() {
  rawInput.value = ''
  result.value   = null
  error.value    = ''
}

// ── Copy JSON ─────────────────────────────────────────────────────────────────
async function copyJson() {
  try {
    await navigator.clipboard.writeText(prettyJson.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch { /* ignore */ }
}
</script>

<style scoped>
/* ── Layout ───────────────────────────────────────────────────────── */
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

/* ── Background ───────────────────────────────────────────────────── */
.bg-mesh {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.mesh-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.14;
  animation: float 16s ease-in-out infinite alternate;
}
.orb-1 { width: 520px; height: 520px; background: var(--clr-accent);  top: -140px; left: -100px; }
.orb-2 { width: 420px; height: 420px; background: var(--clr-accent2); bottom: -100px; right: -70px; animation-delay: -6s; }
.orb-3 { width: 320px; height: 320px; background: var(--clr-accent3); top: 42%; left: 52%; animation-delay: -3s; }

@keyframes float {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(32px, 22px) scale(1.07); }
}

/* ── Header ───────────────────────────────────────────────────────── */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(9, 9, 15, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--clr-border);
}
.header-inner {
  max-width: 1100px;
  margin: auto;
  padding: 0.9rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ── Logo ─────────────────────────────────────────────────────────── */
.logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo-mark {
  width: 24px;
  height: 24px;
  color: var(--clr-accent);
}
.logo-text {
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--clr-accent), var(--clr-accent3));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo-sub {
  font-weight: 400;
  opacity: 0.65;
  margin-left: 0.15rem;
}

/* ── Status badge ─────────────────────────────────────────────────── */
.badge-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.8rem;
  border-radius: var(--radius-pill);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
}
.badge-ok       { background: rgba(16,185,129,.12); color: var(--clr-green); border-color: rgba(16,185,129,.28); }
.badge-err      { background: rgba(239,68,68,.12);  color: var(--clr-red);   border-color: rgba(239,68,68,.28); }
.badge-checking { background: rgba(148,163,184,.1); color: var(--clr-text-muted); border-color: var(--clr-border); }

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.65); }
}

/* ── Main ─────────────────────────────────────────────────────────── */
.main {
  flex: 1;
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: auto;
  width: 100%;
  padding: 2.25rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* ── Card ─────────────────────────────────────────────────────────── */
.card {
  background: var(--clr-surface);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition);
}
.card:hover { border-color: var(--clr-border-glow); }

.card-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-bottom: 1.3rem;
}
.card-icon {
  width: 18px;
  height: 18px;
  color: var(--clr-accent);
  flex-shrink: 0;
}
.icon-red    { color: var(--clr-red); }
.icon-yellow { color: var(--clr-yellow); }

.card-title { font-size: 1rem; font-weight: 700; }
.card-hint  { font-size: 0.78rem; color: var(--clr-text-muted); margin-left: auto; }

/* ── Textarea ─────────────────────────────────────────────────────── */
.input-group {
  position: relative;
  margin-bottom: 1.25rem;
}
.textarea {
  width: 100%;
  background: var(--clr-surface2);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius-md);
  padding: 0.95rem 1rem;
  color: var(--clr-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.86rem;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.textarea:focus {
  border-color: var(--clr-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
}
.textarea::placeholder { color: var(--clr-text-muted); }
.textarea:disabled     { opacity: 0.5; cursor: not-allowed; }

.input-meta {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0.1rem 0;
  font-size: 0.73rem;
  color: var(--clr-text-muted);
}
.hint-kbd { font-style: italic; }

/* ── Buttons ──────────────────────────────────────────────────────── */
.btn-row {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1.3rem;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition), background var(--transition);
}
.btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.btn:active   { transform: scale(0.97); }

.btn-primary {
  background: linear-gradient(135deg, var(--clr-accent), var(--clr-accent2));
  color: #fff;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(99, 102, 241, 0.48);
}
.btn-ghost {
  background: var(--clr-surface2);
  color: var(--clr-text-dim);
  border-color: var(--clr-border);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--clr-surface);
  color: var(--clr-text);
  border-color: var(--clr-accent);
  transform: translateY(-1px);
}

/* ── Copy button ──────────────────────────────────────────────────── */
.btn-copy {
  margin-left: auto;
  padding: 0.28rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--clr-border);
  background: var(--clr-surface2);
  color: var(--clr-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition);
}
.btn-copy:hover { color: var(--clr-accent); border-color: var(--clr-accent); }

/* ── Spinner ──────────────────────────────────────────────────────── */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Alert ────────────────────────────────────────────────────────── */
.alert {
  margin-top: 1rem;
  padding: 0.7rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.86rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.alert svg { width: 16px; height: 16px; flex-shrink: 0; }
.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
}

/* ── Results grid ─────────────────────────────────────────────────── */
.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.identity-card    { grid-column: 1 / 2; }
.summary-card     { grid-column: 2 / 3; }
.hierarchies-card { grid-column: 1 / -1; }
.json-card        { grid-column: 1 / -1; }

@media (max-width: 680px) {
  .results-grid             { grid-template-columns: 1fr; }
  .identity-card,
  .summary-card             { grid-column: 1; }
}

/* ── KV list ──────────────────────────────────────────────────────── */
.kv-list { display: flex; flex-direction: column; gap: 0.7rem; }
.kv { display: flex; flex-direction: column; gap: 0.18rem; }
.kv dt {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--clr-text-muted);
  font-weight: 500;
}
.kv dd code {
  background: var(--clr-surface2);
  border-radius: 5px;
  padding: 0.14rem 0.45rem;
  font-size: 0.82rem;
  color: var(--clr-sky);
}

/* ── Stats ────────────────────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  flex: 1;
  min-width: 80px;
}
.stat-value {
  font-size: 2.1rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}
.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--clr-text-muted);
  font-weight: 500;
}
.text-green  { color: var(--clr-green); }
.text-red    { color: var(--clr-red); }
.text-accent { color: var(--clr-accent); }

/* ── Tags ─────────────────────────────────────────────────────────── */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.tag {
  padding: 0.22rem 0.6rem;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}
.tag-red    { background: rgba(239,68,68,.12);  border: 1px solid rgba(239,68,68,.28);  color: #fca5a5; }
.tag-yellow { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.28); color: #fcd34d; }

/* ── Badge count ──────────────────────────────────────────────────── */
.badge-count {
  margin-left: 0.4rem;
  background: var(--clr-accent);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 0.08rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
}
.badge-red    { background: rgba(239,68,68,.8); }
.badge-yellow { background: rgba(245,158,11,.8); color: #1a1a2e; }

/* ── Hierarchy list ───────────────────────────────────────────────── */
.hierarchy-list { display: flex; flex-direction: column; gap: 1rem; }
.hierarchy-item {
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  padding: 1.1rem;
  transition: border-color var(--transition);
}
.tree-item  { background: rgba(16,185,129,.04);  border-color: rgba(16,185,129,.16); }
.cycle-item { background: rgba(239,68,68,.04);   border-color: rgba(239,68,68,.16); }

.hierarchy-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
}
.h-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.h-dot-green { background: var(--clr-green); }
.h-dot-red   { background: var(--clr-red); }

.h-root {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88rem;
}
.h-badge {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-pill);
}
.h-badge-tree  { background: rgba(16,185,129,.15); color: var(--clr-green); }
.h-badge-cycle { background: rgba(239,68,68,.15);  color: var(--clr-red); }

.cycle-msg {
  font-size: 0.8rem;
  color: var(--clr-red);
  opacity: 0.75;
  padding-left: 1.5rem;
}

/* ── Empty state ──────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--clr-text-muted);
  font-size: 0.88rem;
  border: 1px dashed var(--clr-border);
  border-radius: var(--radius-md);
}

/* ── JSON ─────────────────────────────────────────────────────────── */
.json-pre {
  background: var(--clr-surface2);
  border-radius: var(--radius-md);
  padding: 1rem 1.2rem;
  overflow: auto;
  max-height: 440px;
  font-size: 0.79rem;
  line-height: 1.8;
  color: var(--clr-text-dim);
  border: 1px solid var(--clr-border);
}

/* ── Slide-up transition ──────────────────────────────────────────── */
.slide-up-enter-active { transition: opacity 0.38s ease, transform 0.38s ease; }
.slide-up-enter-from   { opacity: 0; transform: translateY(20px); }

/* ── Footer ───────────────────────────────────────────────────────── */
.footer {
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--clr-text-muted);
  font-size: 0.75rem;
  border-top: 1px solid var(--clr-border);
  position: relative;
  z-index: 1;
}
</style>
