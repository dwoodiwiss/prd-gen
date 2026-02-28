**prd-gen CLI Tool – Final Comprehensive MVP Specification**

**Name**  
prd-gen

**Type**  
Node.js CLI, published to npm

**Command**  
`prd-gen` or `npx prd-gen` (run in directory containing `prd.json`)

**Purpose**  
Single-story-at-a-time review, priority assignment, title/description editing, add/delete; changes saved to `./prd.json`

**Input file** (`prd.json`)  
Array of objects:
```json
[
  {
    "id": "story-001",
    "title": "User login flow",
    "description": "Implement OAuth2 …",
    "priority": 5
  }
]
```

**Startup**  
- Load `./prd.json`  
- Start minimal HTTP server  
- Open browser to localhost  
- Empty/missing file → “No stories to review.” + Add button

**Visual style**  
- #FFFFFF background  
- #000 title, #333 body, #666 secondary  
- Accent: #FF2D55 only (priority, Save, delete, hover/selected)  
- Centered container (~800px), soft shadow  
- Fanned story stack behind current:  
  - 1–5 → all visible  
  - 6–15 → top 5 + “+N”  
  - 16+ → top 3 + “+N”  
  - Stack shrinks on Next  
- Top-right: “Story X / Y” (grey, small)

**Story view**  
- Title (~48px bold, editable)  
- Description (~20px #333, multiline editable)  
- Priority badge (#FF2D55 circle, shows 1–10 or empty)  
- Bottom: 10 round buttons 1–10 (grey → #FF2D55 hover/selected)  
- Bottom center:  
  - “Next story” (grey) when clean  
  - “Save” (#FF2D55 white text) when dirty  
- Top-left (hover): “+” → Add new story (inserts before current)  
- Top-right (hover): red trash → confirm delete

**Blank story defaults**  
title: "New Item"  
description: "Describe here…"  
priority: null

**Save**  
Explicit “Save” click only  
Thin red spinner during write  
No auto-save, no undo

**Add new story**  
Inserts immediately before current  
After save → returns to original position

**Delete**  
Confirm dialog “Delete this story? No undo.”

**End of review**  
After last → dimmed “Finish”  
Click → summary:  
“Good job! You've reviewed all stories.  
Reviewed: X  
Created: Y new  
Deleted: Z”  
Add new story button still visible (adds to end)

**Keyboard shortcuts**  
- 1–9 → priority 1–9  
- 0 → priority 10  
- Enter / Space → Next story or Save  
- Backspace / Delete → open delete confirm  
- N → Add new story  
- Esc → close confirm or blur edit  
Priority keys global; others ignored when editing text

**Tech**  
- Native `http` module (no Express)  
- Serve static HTML/CSS/JS + JSON API  
- Manual body parsing  
- `fs` write on save  
- `open` package or `child_process` for browser  
- Vanilla frontend (or Alpine/htmx)

**Exit**  
Ctrl+C → graceful shutdown (save pending)
