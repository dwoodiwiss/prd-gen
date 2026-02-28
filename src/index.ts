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
      max-width: 800px;
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
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    (function() {
      const app = document.getElementById('app');
      let stories = [];
      let currentIndex = 0;

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
        const x = currentIndex + 1;
        const y = stories.length;

        app.innerHTML = \`
          <div class="card">
            <span class="story-counter">Story \${x} / \${y}</span>
            <div class="story-title">\${escapeHtml(title)}</div>
            <div class="story-description">\${escapeHtml(description)}</div>
          </div>
        \`;
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

      function saveAndRender() {
        fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stories)
        }).then(() => render());
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
