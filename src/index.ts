#!/usr/bin/env node

/**
 * prd-gen CLI entry point
 * Single-story-at-a-time PRD review tool
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PRD_FILE = path.resolve(process.cwd(), 'prd.json');

function readStories(): unknown[] {
  try {
    const content = fs.readFileSync(PRD_FILE, 'utf-8');
    const data = JSON.parse(content) as { userStories?: unknown[] };
    return data.userStories ?? (Array.isArray(data) ? (data as unknown[]) : []);
  } catch {
    return [];
  }
}

function writeStories(stories: unknown[]): void {
  let existing: Record<string, unknown> = {};
  try {
    const content = fs.readFileSync(PRD_FILE, 'utf-8');
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // file doesn't exist or invalid JSON - start fresh
  }
  existing.userStories = stories;
  fs.writeFileSync(PRD_FILE, JSON.stringify(existing, null, 2));
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>prd-gen</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #F2F2F7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #app {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .card {
      position: relative;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
      width: 100%;
      padding: 48px 56px 56px;
    }

    .story-counter {
      position: absolute;
      top: 20px;
      right: 24px;
      font-size: 13px;
      color: #8E8E93;
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    .story-title {
      font-size: 48px;
      font-weight: 700;
      color: #000000;
      line-height: 1.1;
      margin-top: 8px;
      margin-bottom: 24px;
      word-break: break-word;
    }

    .story-description {
      font-size: 20px;
      color: #333333;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state {
      text-align: center;
      padding: 40px 0;
    }

    .empty-state p {
      font-size: 22px;
      color: #333333;
      margin-bottom: 24px;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FF2D55;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 12px 28px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .add-btn:hover { opacity: 0.85; }

    .priority-badge {
      position: absolute;
      top: 20px;
      left: 24px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #FF2D55;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }

    .priority-badge.empty {
      background: #E5E5EA;
    }

    .priority-buttons {
      display: flex;
      gap: 8px;
      margin-top: 32px;
      flex-wrap: wrap;
    }

    .priority-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: #E5E5EA;
      color: #8E8E93;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .priority-btn:hover, .priority-btn.selected {
      background: #FF2D55;
      color: #FFFFFF;
    }

    .story-title[contenteditable], .story-description[contenteditable] {
      cursor: text;
      outline: none;
      border-radius: 8px;
      padding: 4px 8px;
      margin-left: -8px;
      margin-right: -8px;
      transition: background 0.15s;
    }

    .story-title[contenteditable]:hover, .story-description[contenteditable]:hover {
      background: rgba(0,0,0,0.03);
    }

    .story-title[contenteditable]:focus, .story-description[contenteditable]:focus {
      background: rgba(0,0,0,0.04);
      outline: 2px solid rgba(255,45,85,0.2);
    }

    .action-area {
      display: flex;
      justify-content: center;
      margin-top: 40px;
    }

    .action-btn {
      border: none;
      border-radius: 12px;
      padding: 14px 40px;
      font-size: 17px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .action-btn:hover { opacity: 0.85; }

    .save-btn {
      background: #FF2D55;
      color: #FFFFFF;
    }

    .next-btn {
      background: #E5E5EA;
      color: #8E8E93;
    }

    .spinner-ring {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,45,85,0.25);
      border-top-color: #FF2D55;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .card-stack {
      position: relative;
      width: 100%;
      max-width: 800px;
    }

    .card-ghost {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
      transform-origin: center 90%;
    }

    .stack-overflow-badge {
      position: absolute;
      bottom: 14px;
      right: 18px;
      background: rgba(0,0,0,0.10);
      color: #8E8E93;
      border-radius: 10px;
      padding: 2px 9px;
      font-size: 12px;
      font-weight: 600;
    }

    .card-add-btn {
      position: absolute;
      top: -14px;
      left: -14px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FF2D55;
      color: #FFFFFF;
      border: none;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(255,45,85,0.35);
    }

    .card:hover .card-add-btn {
      opacity: 1;
    }

    .card-add-btn:hover {
      opacity: 1 !important;
      transform: scale(1.1);
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    (function() {
      const app = document.getElementById('app');
      let stories = [];
      let currentIndex = 0;
      let dirty = false;
      let saving = false;

      function render() {
        if (stories.length === 0) {
          app.innerHTML = \`
            <div class="card">
              <div class="empty-state">
                <p>No stories to review.</p>
                <button class="add-btn" id="addBtn">+ Add</button>
              </div>
            </div>
          \`;
          document.getElementById('addBtn').addEventListener('click', addStory);
          return;
        }

        const story = stories[currentIndex];
        const title = story.title || '';
        const description = story.description || '';
        const priority = story.priority != null ? story.priority : null;
        const x = currentIndex + 1;
        const y = stories.length;

        const badgeHtml = priority !== null
          ? \`<span class="priority-badge">\${priority}</span>\`
          : \`<span class="priority-badge empty"></span>\`;

        const buttonsHtml = [1,2,3,4,5,6,7,8,9,10].map(function(n) {
          const sel = priority === n ? ' selected' : '';
          return \`<button class="priority-btn\${sel}" data-priority="\${n}">\${n}</button>\`;
        }).join('');

        const actionHtml = saving
          ? \`<div class="action-area"><span class="spinner-ring"></span></div>\`
          : \`<div class="action-area"><button class="action-btn \${dirty ? 'save-btn' : 'next-btn'}" id="actionBtn">\${dirty ? 'Save' : 'Next story'}</button></div>\`;

        var remaining = stories.length - currentIndex - 1;
        var visibleGhosts, overflow;
        if (remaining <= 5) {
          visibleGhosts = remaining;
          overflow = 0;
        } else if (remaining <= 15) {
          visibleGhosts = 5;
          overflow = remaining - 5;
        } else {
          visibleGhosts = 3;
          overflow = remaining - 3;
        }
        var rotationSets = { 0: [], 1: [3], 2: [5, 2], 3: [6, 3, 1.5], 4: [7, 4.5, 2.5, 1], 5: [8, 5.5, 3.5, 2, 0.5] };
        var rotations = rotationSets[visibleGhosts] || [];
        var ghostHtml = '';
        for (var gi = 0; gi < visibleGhosts; gi++) {
          var rot = rotations[gi];
          var badge = (gi === 0 && overflow > 0) ? \`<span class="stack-overflow-badge">+\${overflow}</span>\` : '';
          ghostHtml += \`<div class="card-ghost" style="transform: rotate(\${rot}deg);">\${badge}</div>\`;
        }

        app.innerHTML = \`
          <div class="card-stack">
            \${ghostHtml}
            <div class="card">
              <button class="card-add-btn" id="addStoryBtn" title="Add story before this one">+</button>
              \${badgeHtml}
              <span class="story-counter">Story \${x} / \${y}</span>
              <div class="story-title" contenteditable="true" id="titleField" spellcheck="false">\${escapeHtml(title)}</div>
              <div class="story-description" contenteditable="true" id="descField">\${escapeHtml(description)}</div>
              <div class="priority-buttons">\${buttonsHtml}</div>
              \${actionHtml}
            </div>
          </div>
        \`;

        var addStoryBtn = document.getElementById('addStoryBtn');
        if (addStoryBtn) {
          addStoryBtn.addEventListener('click', addStoryBefore);
        }

        document.querySelectorAll('.priority-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            stories[currentIndex].priority = parseInt(btn.getAttribute('data-priority'), 10);
            dirty = true;
            render();
          });
        });

        var titleField = document.getElementById('titleField');
        var descField = document.getElementById('descField');

        if (titleField) {
          titleField.addEventListener('input', function() {
            stories[currentIndex].title = titleField.textContent || '';
            dirty = true;
          });
          titleField.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { titleField.blur(); }
          });
        }

        if (descField) {
          descField.addEventListener('input', function() {
            stories[currentIndex].description = descField.innerText || '';
            dirty = true;
          });
          descField.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { descField.blur(); }
          });
        }

        var actionBtn = document.getElementById('actionBtn');
        if (actionBtn) {
          if (dirty) {
            actionBtn.addEventListener('click', function() {
              saving = true;
              render();
              fetch('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stories)
              }).then(function() {
                dirty = false;
                saving = false;
                render();
              }).catch(function() {
                saving = false;
                render();
              });
            });
          } else {
            actionBtn.addEventListener('click', function() {
              if (currentIndex < stories.length - 1) {
                currentIndex++;
              }
              render();
            });
          }
        }
      }

      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function addStory() {
        const newStory = { title: 'New Item', description: 'Describe here\u2026', priority: null };
        stories.splice(currentIndex, 0, newStory);
        saveAndRender();
      }

      function addStoryBefore() {
        const newStory = { title: 'New Item', description: 'Describe here\u2026', priority: null };
        stories.splice(currentIndex, 0, newStory);
        currentIndex++;
        saveAndRender();
      }

      function saveAndRender() {
        fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stories)
        }).then(function() {
          dirty = false;
          render();
        });
      }

      fetch('/api/stories')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          stories = Array.isArray(data) ? data : [];
          render();
        })
        .catch(function() {
          stories = [];
          render();
        });
    })();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  if (url === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML_PAGE);
    return;
  }

  if (url === '/api/stories' && method === 'GET') {
    const stories = readStories();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stories));
    return;
  }

  if (url === '/api/stories' && method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const stories = JSON.parse(body) as unknown[];
        writeStories(stories);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`prd-gen running at ${url}`);
  openBrowser(url);
});

function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  exec(command, (err) => {
    if (err) {
      console.error('Could not open browser automatically:', err.message);
    }
  });
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});
