#!/usr/bin/env bash
set -e

echo "=== Setting up Ember Analysis Project ==="

# 1. Install Rust toolchain if missing
if ! command -v rustup &> /dev/null; then
  echo "Installing rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # Load cargo environment
  source "$HOME/.cargo/env"
fi

echo "Updating Rust toolchain to stable..."
rustup default stable
# Optional components
rustup component add clippy rustfmt || true

echo "Rust toolchain ready."

# 2. Install Node via nvm if missing
if ! command -v node &> /dev/null; then
  if ! command -v nvm &> /dev/null; then
    echo "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  echo "Installing latest LTS Node.js..."
  nvm install --lts
  nvm use --lts
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# 3. Install JS dependencies
echo "Installing JavaScript dependencies..."
npm install

# Ensure Zod is installed for schema validation
if ! npm list zod &> /dev/null; then
  echo "Installing Zod..."
  npm install zod
fi

# 4. Install Tauri CLI via Cargo if missing
if ! cargo install --list | grep -q tauri-cli; then
  echo "Installing Tauri CLI..."
  cargo install tauri-cli --locked
fi

echo "All CLI tools are installed."

# 5. Build Rust backend
echo "Building Rust backend (src-tauri)..."
cd src-tauri
cargo build
cd -

echo "Setup complete!"
echo "You can now run: npm run dev (frontend) or npm run tauri-dev (full app)" 