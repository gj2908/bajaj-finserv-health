<template>
  <ul class="tree-ul" :class="`lvl-${depth}`">
    <li
      v-for="(children, nodeName) in node"
      :key="nodeName"
      class="tree-li"
    >
      <!-- Node label -->
      <div class="tree-node-label">
        <span class="node-connector" aria-hidden="true"></span>
        <span :class="['node-bubble', depth === 0 ? 'node-root' : 'node-child']">
          {{ nodeName }}
        </span>
        <span v-if="!hasChildren(children)" class="leaf-badge">LEAF</span>
      </div>

      <!-- Recurse -->
      <TreeNode
        v-if="hasChildren(children)"
        :node="children"
        :depth="depth + 1"
      />
    </li>
  </ul>
</template>

<script setup>
defineProps({
  node:  { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

function hasChildren(obj) {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0
}
</script>

<style scoped>
.tree-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* indent any level that is not root */
.tree-ul:not(.lvl-0) {
  padding-left: 1.75rem;
  border-left: 1px dashed rgba(99, 102, 241, 0.25);
  margin-left: 0.5rem;
}

.tree-li {
  position: relative;
  padding: 0.3rem 0;
}

.tree-node-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.node-connector {
  display: inline-block;
  width: 18px;
  height: 1px;
  background: rgba(99, 102, 241, 0.35);
  flex-shrink: 0;
}

/* hide connector at root level */
.lvl-0 > .tree-li > .tree-node-label > .node-connector {
  display: none;
}

.node-bubble {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 0.9rem;
  border: 2px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: default;
  flex-shrink: 0;
}

.node-bubble:hover {
  transform: scale(1.12);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.45);
}

.node-root {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.node-child {
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.3);
}

.leaf-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}
</style>
