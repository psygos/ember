# Ember Analysis

**Desktop application** for analyzing WhatsApp chat data, built with **Vue 3**, **TypeScript**, **Tailwind CSS**, **Vite**, and **Tauri** (Rust backend).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Usage](#usage)
- [Building for Production](#building-for-production)
- [Cleaning](#cleaning)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- **Node.js** ≥ 16
- **npm** or **Yarn**
- **Rust** toolchain (≥ 1.60)
- [Tauri prerequisites](https://tauri.studio/docs/getting-started/intro) (cargo, linker, etc.)

---

## Getting Started

1. **Clone** the repository:
   ```bash
   git clone https://github.com/psygos/ember-analysis.git
   cd ember-analysis
   ```
2. **Install** front-end dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. (Optional) Create a `.env` file in the project root for any VITE_ environment vars.

---

## Development

**Full Tauri dev mode** (front-end + Rust backend):
```bash
npm run tauri-dev
```

**Front-end only** (Vue + Vite):
```bash
npm run dev
```
Open your browser at <http://localhost:5173>.

---

## Usage

1. In the app, go to **Import Chats**.
2. Select or drop your WhatsApp chat export JSON file(s).
3. The app caches parsed data under `data/cache`.
4. Switch to **Graph** to explore entity relationships.
5. Switch to **Calendar** for a timeline of memories.
6. Use **Recall Quiz** to test your memory game.

---

## Building for Production

1. Build the front-end bundle:
   ```bash
   npm run build
   ```
2. Build the Tauri desktop bundle:
   ```bash
   npm run tauri-build
   ```
3. Generated installers/bundles are in `src-tauri/target/release/bundle`.

---

## Cleaning

Remove build artifacts and caches:
```bash
npm run clean
npm run clean:rust
# or
npm run clean:all
```

---

## Project Structure

```
ember-analysis/
├── src/                 # Vue 3 app (SFCs)
├── public/              # Static assets
├── data/                # Imported chats & analysis cache
├── src-tauri/           # Rust backend (Tauri)
├── package.json         # Scripts & dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
└── tailwind.config.js   # Tailwind CSS config
```

---

## Contributing

Contributions welcome! Feel free to open issues or PRs, and adhere to repo coding style.

---

## License

Distributed under the **MIT** License. See [LICENSE](LICENSE) for details.
