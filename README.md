# BFHL Full-Stack Challenge — SRM

> Tree hierarchy analyser with cycle detection, built with **Express (Node.js)** backend and **Vue 3 + Vite** frontend.

---

## Project Structure

```
bajaj-finserv/
├── backend/          # Express API  (Node.js)
│   ├── src/
│   │   └── processor.js   # Core tree/cycle logic
│   ├── index.js           # Server entry
│   └── .env               # Identity config ← EDIT THIS
└── frontend/         # Vue 3 + Vite SPA
    └── src/
        ├── App.vue         # Main interface
        └── components/
            └── TreeNode.vue
```

---

## Quick Start

### 1. Configure Identity

Edit `backend/.env`:
```env
USER_ID=yourname_ddmmyyyy
EMAIL=you@srmist.edu.in
ROLL_NUMBER=RA2211003011234
```

### 2. Start Backend
```bash
cd backend
npm install
node index.js
# → http://localhost:3000
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API

### `POST /bfhl`

**Request:**
```json
{ "data": ["A->B", "A->C", "B->D", "G->H", "H->G", "X->invalid", "A->B"] }
```

**Response:**
```json
{
  "is_success": true,
  "user_id": "...",
  "email_id": "...",
  "college_roll_number": "...",
  "hierarchies": [
    { "root": "A", "has_cycle": false, "tree": { "A": { "B": { "D": {} }, "C": {} } }, "depth": 3 },
    { "root": "G", "has_cycle": true, "tree": {} }
  ],
  "invalid_entries": ["X->invalid"],
  "duplicate_edges": ["A->B"],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

### `GET /bfhl`
Returns operation hint (`operation_code: 1`).

### `GET /health`
Returns `{ "status": "ok" }`.

---

## Edge Input Rules

| Input | Classification |
|---|---|
| `A->B` — two single uppercase letters | ✅ Valid edge |
| `A->BC` — multi-char target | ❌ Invalid entry |
| `a->b` — lowercase | ❌ Invalid entry |
| Duplicate of first-seen edge | 🔁 Duplicate edge |
| Node with multiple parents | 🔁 Second parent treated as duplicate |

---

## Business Logic (processor.js)

1. **Parse & Validate** each item against `^([A-Z])->([A-Z])$`
2. **Deduplicate** exact string matches; multi-parent edges become duplicates
3. **Union-Find** to group connected nodes into components
4. **DFS Cycle Detection** per component
5. **Tree Building** — recursive `buildTree()` from root nodes
6. **Depth Calculation** — longest root-to-leaf path (node count)
7. **Summary** — total trees, total cycles, root of deepest tree
