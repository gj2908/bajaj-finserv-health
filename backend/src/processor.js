/**
 * BFHL Processor — Tree Construction & Cycle Detection
 *
 * Rules:
 *  - Valid edge: single uppercase letter -> single uppercase letter  (e.g. "A->B")
 *  - Invalid entries go to invalid_entries[]
 *  - Duplicate edges (exact string match after the first) go to duplicate_edges[]
 *  - Multi-parent: first-encountered parent wins
 *  - Root = node that never appears as a child
 *  - Cycle detection via DFS
 *  - Pure-cycle group (no root) → lexicographically smallest node becomes "root"
 *  - depth = length of longest root-to-leaf path (node count)
 *  - largest_tree_root: root of deepest non-cyclic tree; tie → lex-smaller root
 */

const EDGE_RE = /^([A-Z])->([A-Z])$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEdge(raw) {
  const m = EDGE_RE.exec(raw.trim());
  return m ? { from: m[1], to: m[2] } : null;
}

/**
 * Union-Find to group connected nodes.
 */
function makeUF(nodes) {
  const parent = {};
  nodes.forEach(n => (parent[n] = n));

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  return { find, union };
}

/**
 * Detect cycle in a directed graph using DFS (coloring).
 * Returns true if cycle exists.
 */
function hasCycle(nodes, adjList) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  nodes.forEach(n => (color[n] = WHITE));

  function dfs(u) {
    color[u] = GRAY;
    for (const v of (adjList[u] || [])) {
      if (color[v] === GRAY) return true;
      if (color[v] === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;
    return false;
  }

  for (const n of nodes) {
    if (color[n] === WHITE && dfs(n)) return true;
  }
  return false;
}

/**
 * Build a recursive tree object rooted at `root`.
 * Uses parent->children map.
 */
function buildTree(root, children) {
  const node = { [root]: {} };
  for (const child of (children[root] || []).sort()) {
    Object.assign(node[root], buildTree(child, children));
  }
  return node;
}

/**
 * Compute depth (longest path node count) of the tree rooted at `root`.
 */
function computeDepth(root, children) {
  const kids = children[root] || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map(k => computeDepth(k, children)));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function processBfhlData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];

  const seenEdgeSet = new Set();
  const validEdges = []; // { from, to } — first-seen only
  const childParent = {};  // child → first-seen parent

  // ── Pass 1: validate & deduplicate ──────────────────────────────────────
  for (const raw of data) {
    const edge = parseEdge(String(raw ?? ''));

    if (!edge) {
      invalid_entries.push(raw);
      continue;
    }

    const key = `${edge.from}->${edge.to}`;

    if (seenEdgeSet.has(key)) {
      duplicate_edges.push(raw);
      continue;
    }

    seenEdgeSet.add(key);

    // Multi-parent rule: first parent wins
    if (edge.to in childParent) {
      // child already has a parent — treat this as a duplicate-parent
      // (still add to validEdges so the node participates in group)
      // but the child's parent won't change
      duplicate_edges.push(raw);
      continue;
    }

    childParent[edge.to] = edge.from;
    validEdges.push(edge);
  }

  // ── Pass 2: collect all nodes & build adjacency ──────────────────────────
  const allNodes = new Set();
  const adjList = {}; // from → [to, ...] (directed)
  const children = {}; // parent → [child, ...] (tree edges)

  for (const { from, to } of validEdges) {
    allNodes.add(from);
    allNodes.add(to);

    if (!adjList[from]) adjList[from] = [];
    adjList[from].push(to);

    if (!children[from]) children[from] = [];
    children[from].push(to);
  }

  // ── Pass 3: group nodes by connected component (undirected) ─────────────
  const nodesArr = [...allNodes];
  const uf = makeUF(nodesArr);
  for (const { from, to } of validEdges) {
    uf.union(from, to);
  }

  const groups = {}; // root-id → Set of node names
  for (const n of nodesArr) {
    const r = uf.find(n);
    if (!groups[r]) groups[r] = new Set();
    groups[r].add(n);
  }

  // ── Pass 4: build hierarchies ────────────────────────────────────────────
  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = null;
  let largestDepth = -Infinity;

  for (const groupNodes of Object.values(groups)) {
    const nodesInGroup = [...groupNodes].sort();
    const cyclicGroup = hasCycle(nodesInGroup, adjList);

    if (cyclicGroup) {
      // Pure cycle or cycle-containing group — no tree, find lex-smallest "root"
      const candidates = nodesInGroup.filter(
        n => !Object.keys(childParent).includes(n)
      );
      const groupRoot =
        candidates.length > 0
          ? candidates.sort()[0]
          : nodesInGroup.sort()[0];

      hierarchies.push({
        root: groupRoot,
        has_cycle: true,
        tree: {},
      });

      totalCycles++;
    } else {
      // Find root(s): nodes that are never children
      const roots = nodesInGroup.filter(n => !(n in childParent));

      // Each root in the group is a separate tree
      for (const root of roots.sort()) {
        const tree = buildTree(root, children);
        const depth = computeDepth(root, children);

        hierarchies.push({
          root,
          has_cycle: false,
          tree,
          depth,
        });

        totalTrees++;

        if (
          depth > largestDepth ||
          (depth === largestDepth &&
            largestTreeRoot !== null &&
            root < largestTreeRoot)
        ) {
          largestDepth = depth;
          largestTreeRoot = root;
        }
      }

      // If a group somehow has no root (all nodes are children → pure cycle
      // but hasCycle returned false — shouldn't happen but guard it)
      if (roots.length === 0) {
        const groupRoot = nodesInGroup.sort()[0];
        hierarchies.push({
          root: groupRoot,
          has_cycle: true,
          tree: {},
        });
        totalCycles++;
      }
    }
  }

  // Sort hierarchies by root for deterministic output
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

module.exports = { processBfhlData };
