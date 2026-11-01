# CPulse

CPulse is a client-side competitive programming progress tracker for the 494-question course dataset in `data.json`. It provides a focused workspace for marking questions as solved, reviewing course progress, and maintaining that progress across sessions.

## Features

- Track all questions from the source dataset in their original ID order.
- Mark individual questions as solved or unsolved.
- View total, solved, unsolved, and completion statistics.
- See completion progress through a progress bar and circular indicator.
- Search by question name or ID.
- Filter questions by all, solved, or unsolved status.
- Sort questions by ascending ID, descending ID, or alphabetically.
- Mark or unmark all questions currently visible after filtering.
- Review recently solved questions and daily activity.
- Export progress as a JSON file.
- Import a previously exported progress file with validation and confirmation.
- Reset all progress with a confirmation step.
- Switch between light and dark themes.
- Use the interface on desktop, tablet, and mobile screens.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

## Getting Started

### Requirements

- Node.js 18 or newer
- npm

### Installation

```bash
npm install
```

### Development server

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Data and Persistence

The original question list is loaded from `data.json` and is kept separate from user progress. The application validates stored question IDs against that dataset before restoring them.

The following user preferences are stored in browser local storage:

- Solved question IDs
- The timestamp for each solved question
- The selected light or dark theme

Clearing browser storage removes local progress. Use the export feature before clearing storage or moving to another browser.

## Import and Export

Export creates a `cpulse-progress.json` file containing solved question IDs, solve timestamps, and export metadata. Import accepts a valid CPulse JSON export, validates every question ID against the current dataset, and asks for confirmation before replacing existing progress.

## Project Structure

```text
.
├── data.json              # Course question dataset
├── index.html             # Application entry document and favicon
├── public/
│   └── favicon.svg        # CPulse browser favicon
├── src/
│   ├── App.tsx            # Application state and reusable UI components
│   ├── main.tsx           # React entry point
│   └── styles.css         # Theme variables and component styling
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## Validation

Run the production build to check TypeScript and bundle the application:

```bash
npm run build
```

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

Progress, solved timestamps, and theme preference are stored in the browser's local storage. Use the import/export controls to move progress between browsers.
