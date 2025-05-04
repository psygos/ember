# Ember Analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()

Ember Analysis is a cross-platform desktop application for importing, visualizing, and quizzing yourself on your WhatsApp chat data. Built with Vue 3, TypeScript, Tailwind CSS, Vite, and Tauri (Rust).

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Packaging & Distribution](#packaging--distribution)
- [Data Caching & Storage](#data-caching--storage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Appendix: Installing Rust](#appendix-installing-rust)

## Features

- Import WhatsApp chat export JSON files
- Interactive graph visualization of entities and relationships
- Calendar view for timeline analysis
- Recall quiz to test your memory of chat events
- Data caching for faster subsequent loads
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

- Node.js v16 or higher
- npm or Yarn
- Rust toolchain (rustc ≥ 1.60, cargo)
- Tauri prerequisites (see [Tauri docs](https://tauri.studio/docs/getting-started/intro))

## Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/psygos/ember.git
   cd ember
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. (Optional) Create a `.env` file in the root to define `VITE_*` environment variables:
   ```bash
   VITE_API_KEY=your_api_key
   ```

## Configuration

- `VITE_*` variables control API integrations and feature flags.
- Tauri settings in `src-tauri/tauri.conf.json`.
- GUI theming via Tailwind CSS configuration (`tailwind.config.js`).

## Development

- **Full stack (Tauri + Vue)**:
  ```bash
  npm run tauri-dev
  ```
- **Frontend only**:
  ```bash
  npm run dev
  ```
  Open [http://localhost:5173](http://localhost:5173/) in your browser.

## Usage

1. Launch the app.
2. Navigate to **Import Chats** and select your WhatsApp JSON exports.
3. View or filter imported chats under **Chats**.
4. Explore the **Graph** to visualize relationships.
5. Switch to **Calendar** for a timeline view.
6. Play **Recall Quiz** to test your memory.
7. Export analysis results via **Export** menu.

## Project Structure

```
ember/
├── src/                      # Vue 3 frontend (SFCs)
│   ├── components/           # Reusable Vue components
│   ├── utils/                # Utility functions and API wrappers
│   ├── App.vue               # Root component
│   └── main.ts               # Entry point
├── public/                   # Static assets
├── data/                     # Imported chats & cache
│   └── cache/                # Parsed data cache
├── src-tauri/                # Rust backend (Tauri)
│   ├── src/main.rs
│   └── tauri.conf.json
├── package.json              # Scripts & dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite config
├── tailwind.config.js        # Tailwind CSS config
└── README.md                 # This file
```

## Scripts

| Command               | Description                                |
|-----------------------|--------------------------------------------|
| `npm run dev`         | Run frontend in dev mode                   |
| `npm run tauri-dev`   | Run full Tauri (frontend + backend) in dev |
| `npm run build`       | Build frontend for production              |
| `npm run tauri-build` | Build Tauri app for all platforms          |
| `npm run clean`       | Remove frontend build artifacts            |
| `npm run clean:rust`  | Remove Rust build artifacts                |
| `npm run lint`        | Run linters and format checks              |

## Packaging & Distribution

After `npm run tauri-build`, platform-specific installers and bundles are generated at:
```
src-tauri/target/release/bundle/
```
Distribute the `.dmg` (macOS), `.exe` (Windows), and AppImage (Linux) files found there.

## Data Caching & Storage

- Imported chat JSON files are read and stored in `data/`.
- Parsed and analyzed data is cached under `data/cache/` for faster loading.
- Clear cache using:
  ```bash
  npm run clean:cache
  ```

## Testing

Currently, there are no automated tests. Future plans include unit and integration tests for frontend and backend.

## Troubleshooting

- **Missing Rust toolchain**: ensure `rustup` is installed and `cargo` is on your PATH.
- **Port conflicts**: change dev server port in `vite.config.ts`.
- **Tauri build errors**: see [Tauri troubleshooting](https://tauri.studio/docs/getting-started/troubleshooting).

## Contributing

We welcome contributions! Please:

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/xyz`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to your branch (`git push origin feature/xyz`).
5. Open a Pull Request.

Follow our [Code of Conduct](CODE_OF_CONDUCT.md) and style guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Vue.js](https://vuejs.org/)
- [Tauri](https://tauri.studio/)
- [Tailwind CSS](https://tailwindcss.com/)

## Appendix: Installing Rust

To install the Rust toolchain:

1. Install `rustup`:
   ```bash
   curl https://sh.rustup.rs -sSf | sh
   ```
2. Follow the interactive prompts to install the stable toolchain.
3. Ensure your PATH is updated (restart your shell or run `source $HOME/.cargo/env`).
4. Verify installation:
   ```bash
   rustc --version
   cargo --version
   ```
