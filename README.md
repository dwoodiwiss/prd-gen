# prd-gen

A CLI tool for reviewing PRDs (Product Requirements Documents) one user story at a time. Assign priorities, edit stories, add or delete entries — all saved back to `prd.json`.

![prd-gen](https://raw.githubusercontent.com/dwoodiwiss/prd-gen/main/product-image.png)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Usage

### Run with npx (recommended)

No installation needed. Run this from the directory containing your `prd.json`:

```bash
npx prd-gen
```

The app starts a local server on [http://localhost:3000](http://localhost:3000) and opens the PRD review UI in your browser. Press `Ctrl+C` to stop.

### Install globally

```bash
npm install -g prd-gen
prd-gen
```

## Development

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

### Build and run

```bash
npm run build
npm start
```

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
