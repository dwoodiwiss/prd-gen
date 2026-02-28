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
</head>
<body>
  <h1>prd-gen</h1>
  <p>PRD review tool loading...</p>
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
