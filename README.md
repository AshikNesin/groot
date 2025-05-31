# Express.js TypeScript App

A simple Express.js application with TypeScript support and Biome for linting and formatting.

## Prerequisites

* Node.js (v18 or later recommended)
* npm or yarn

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

## Available Scripts

* **`npm run build`**: Compiles TypeScript code to JavaScript in the `dist` directory.
* **`npm start`**: Starts the application from the compiled code in `dist`.
* **`npm run dev`**: Starts the application in development mode with live reloading. It watches for TypeScript changes, recompiles, and restarts the server.
* **`npm run lint`**: Lints the TypeScript code in the `src` directory using Biome.
* **`npm run format`**: Formats the TypeScript code in the `src` directory using Biome.

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
   npm run build
   ```

2. **Start the application:**
   ```bash
   npm start
   ```
   The server will be running on `http://localhost:3000` by default.

3. **Development mode:**
   ```bash
   npm run dev
   ```
   This will start the server and automatically restart it when you make changes to the TypeScript files.

## Linting and Formatting

* **Lint:**
  ```bash
  npm run lint
  ```
* **Format:**
  ```bash
  npm run format
  ```
