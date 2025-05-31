# Express.js TypeScript App

A simple Express.js application with TypeScript support and Biome for linting and formatting.

## Prerequisites

* Node.js (v18 or later recommended)
* npm or yarn
* pnpm (This project uses pnpm as the package manager. If you don't have it installed, you can install it globally via npm: `npm install -g pnpm`)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

## Available Scripts

* **`pnpm build`**: Compiles TypeScript code to JavaScript in the `dist` directory.
* **`pnpm start`**: Starts the application from the compiled code in `dist`.
* **`pnpm dev`**: Starts the application in development mode using `tsx`. It watches for changes in `src/index.ts` and automatically restarts the server.
* **`pnpm lint`**: Lints the TypeScript code in the `src` directory using Biome.
* **`pnpm format`**: Formats the TypeScript code in the `src` directory using Biome.

## Project Structure

```
├── src/
│   └── index.ts      # Main application file
├── dist/             # Compiled JavaScript output (after running npm run build)
├── biome.json        # Biome configuration
├── package.json      # Project metadata and dependencies
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Usage

1. **Build the application:**
   ```bash
   pnpm build
   ```

2. **Start the application:**
   ```bash
   pnpm start
   ```
   The server will be running on `http://localhost:3000` by default.

3. **Development mode:**
   ```bash
   pnpm dev
   ```
   This will start the server and automatically restart it when you make changes to the TypeScript files.

## Linting and Formatting

* **Lint:**
  ```bash
  pnpm lint
  ```
* **Format:**
  ```bash
  pnpm format
  ```
