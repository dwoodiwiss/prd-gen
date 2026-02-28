# prd-gen

A CLI tool for reviewing PRDs (Product Requirements Documents) one user story at a time. Assign priorities, edit stories, add or delete entries — all saved back to `prd.json`.

![prd-gen](product-image.png)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm

## Install dependencies

```bash
npm install
```

## Usage

### Run in development mode

```bash
npm run dev
```

### Build and run

```bash
npm run build
npm start
```

The app starts a local server on [http://localhost:3000](http://localhost:3000) and opens the PRD review UI in your browser.

## Data file

The tool reads and writes user stories from `prd.json` in the current working directory. The file should have the following shape:

```json
{
  "project": "my-project",
  "description": "...",
  "userStories": []
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run directly with `tsx` (no build step) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled output |
| `npm run typecheck` | Type-check without emitting files |
