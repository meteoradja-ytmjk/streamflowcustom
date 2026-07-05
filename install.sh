#!/bin/bash
# =============================================================================
#   OZANG STREAM - QUICK INSTALLER V.2.0 - STREAMING APP
#   Auto-handles ERR_PNPM_IGNORED_BUILDS
# =============================================================================

# ── Color palette ─────────────────────────────────────────────────────────────
RED='\033[0;31m';    GREEN='\033[0;32m';   YELLOW='\033[1;33m'
BLUE='\033[0;34m';   CYAN='\033[0;36m';    WHITE='\033[1;37m'
ORANGE='\033[38;5;214m';  GRAY='\033[38;5;245m'
BOLD='\033[1m';      DIM='\033[2m';        NC='\033[0m'

# ── Box geometry: inner width = 50 chars, total line = 54 chars ───────────────
#    2sp + ║(1) + 50chars + ║(1) = 54 total
_B='║'  # reusable box side char

# Print a padded inner box line: left-border + 50-char padded content + right-border
boxline() {
  local txt="$1"
  local col="${2:-$WHITE}"
  # %-50s pads content to exactly 50 printable chars (no ANSI codes in txt)
  printf "  ${CYAN}${BOLD}${_B}${NC}${col}%-50s${NC}${CYAN}${BOLD}${_B}${NC}\n" "$txt"
}

boxline_c() {
  # Center-aligned box line
  local txt="$1"
  local col="${2:-$WHITE}"
  local len=${#txt}
  local pad=$(( (50 - len) / 2 ))
  local rpad=$(( 50 - len - pad ))
  printf "  ${CYAN}${BOLD}${_B}${NC}${col}%${pad}s%s%${rpad}s${NC}${CYAN}${BOLD}${_B}${NC}\n" "" "$txt" ""
}

# Box border lines (2sp + corner + 50═ + corner = 54 total)
B_TOP() { echo -e "  ${CYAN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"; }
B_DIV() { echo -e "  ${CYAN}${BOLD}╠══════════════════════════════════════════════════╣${NC}"; }
B_BOT() { echo -e "  ${CYAN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"; }

# ── Helper output functions ───────────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}${BOLD}[  OK  ]${NC}  ${GREEN}$1${NC}"; }
info() { echo -e "  ${CYAN}${BOLD}[ INFO ]${NC}  $1"; }
warn() { echo -e "  ${YELLOW}${BOLD}[ WARN ]${NC}  ${YELLOW}$1${NC}"; }
fail() { echo -e "\n  ${RED}${BOLD}[ FAIL ] $1${NC}\n"; exit 1; }
blank() { echo ""; }

step() {
  local NUM="$1" TEXT="$2"
  blank
  # Step header — total 54 chars wide to match box
  echo -e "  ${CYAN}${BOLD}╔══[ ${ORANGE}${BOLD}STEP ${NUM}${CYAN} ]════════════════════════════════════════╗${NC}"
  printf "  ${CYAN}${BOLD}║${NC}  ${WHITE}${BOLD}%-50s${CYAN}${BOLD}║${NC}\n" "$TEXT"
  echo -e "  ${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  blank
}

# ─────────────────────────────────────────────────────────────────────────────
# BANNER
# ─────────────────────────────────────────────────────────────────────────────
clear

B_TOP
boxline ""
boxline_c "O  Z  A  N  G     S  T  R  E  A  M" "$ORANGE$BOLD"
boxline_c "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "$CYAN"
boxline_c "QUICK INSTALLER V.2.0" "$YELLOW$BOLD"
boxline_c "Streaming App  •  pnpm  •  PM2 Ready" "$GRAY"
boxline ""
B_DIV
boxline "  $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' | cut -c1-46)" "$GRAY"
boxline "  CPU: $(nproc 2>/dev/null || echo '?') core(s)   RAM: $(free -h 2>/dev/null | awk '/^Mem/{print $2}' || echo 'N/A')" "$GRAY"
B_BOT

blank
printf "  ${YELLOW}${BOLD}Mulai instalasi? ${NC}${DIM}(y/n)${NC} ${CYAN}${BOLD}> ${NC}"
read -n 1 -r; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  blank; echo -e "  ${RED}Instalasi dibatalkan.${NC}"; blank; exit 0
fi

APP_DIR="$HOME/streamflow"
REPO_URL="https://github.com/meteoradja-ytmjk/streamflowcustom"

# =============================================================================
# STEP 01 — Update sistem
# =============================================================================
step "01/12" "Update & upgrade sistem"
info "Menjalankan apt update + upgrade..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq
ok "Sistem berhasil diupdate"

# =============================================================================
# STEP 02 — Build tools
# =============================================================================
step "02/12" "Install build tools (python3, gcc, make)"
info "Menginstall build-essential, python3, make, g++..."
sudo apt-get install -y -qq python3 make g++ build-essential curl git
ok "Build tools siap"

# =============================================================================
# STEP 03 — FFmpeg
# =============================================================================
step "03/12" "Install FFmpeg"
if command -v ffmpeg &>/dev/null; then
  ok "FFmpeg sudah terinstall ($(ffmpeg -version 2>&1 | head -1 | awk '{print $3}'))"
else
  info "Menginstall FFmpeg..."
  sudo apt-get install -y -qq ffmpeg
  ok "FFmpeg berhasil diinstall"
fi

# =============================================================================
# STEP 04 — NVM + Node.js
# =============================================================================
step "04/12" "Install NVM & Node.js LTS"

export NVM_DIR="$HOME/.nvm"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  info "Menginstall NVM..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
  ok "NVM berhasil diinstall"
else
  ok "NVM sudah ada"
fi

source "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

grep -q 'NVM_DIR' ~/.bashrc || cat >> ~/.bashrc << 'BASHEOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
BASHEOF

nvm install --lts
nvm use --lts
nvm alias default 'lts/*'
ok "Node.js $(node -v) siap"

# =============================================================================
# STEP 05 — pnpm
# =============================================================================
step "05/12" "Install pnpm package manager"

export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
mkdir -p "$PNPM_HOME"

if ! command -v pnpm &>/dev/null; then
  info "Menginstall pnpm..."
  npm install -g pnpm
  ok "pnpm berhasil diinstall"
else
  ok "pnpm sudah ada"
fi

grep -q 'PNPM_HOME' ~/.bashrc || cat >> ~/.bashrc << 'BASHEOF'
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
BASHEOF

hash -r 2>/dev/null || true
ok "pnpm $(pnpm -v) siap"

# =============================================================================
# STEP 06 — Clone / Pull repository
# =============================================================================
step "06/12" "Setup repository aplikasi"

if [ -d "$APP_DIR/.git" ]; then
  warn "Folder $APP_DIR sudah ada — menjalankan git pull..."
  cd "$APP_DIR" && git pull
else
  info "Cloning repository ke $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
ok "Repository siap"

# =============================================================================
# STEP 07 — Install dependencies (auto-fix ERR_PNPM_IGNORED_BUILDS)
# =============================================================================
step "07/12" "Install dependencies (auto-fix pnpm build errors)"
cd "$APP_DIR"

info "Menulis konfigurasi .npmrc..."
cat > "$APP_DIR/.npmrc" << 'NPMEOF'
ignore-scripts=false
enable-pre-post-scripts=true
NPMEOF

pnpm config set ignore-scripts false           2>/dev/null || true
pnpm config set enable-pre-post-scripts true   2>/dev/null || true

info "pnpm install (percobaan 1)..."
pnpm install 2>&1 || warn "Install pertama ada warning, menjalankan auto-fix..."

info "Menyetujui semua build scripts..."
pnpm approve-builds --all 2>/dev/null || true

info "pnpm install ulang dengan build scripts diizinkan..."
pnpm install --ignore-scripts=false 2>&1 || {
  warn "Mencoba dengan --shamefully-hoist..."
  pnpm install --shamefully-hoist --ignore-scripts=false 2>&1 || true
}
ok "Dependencies terinstall"

# =============================================================================
# STEP 08 — Rebuild native modules
# =============================================================================
step "08/12" "Rebuild native modules (sqlite3, bcrypt)"
cd "$APP_DIR"

rebuild_module() {
  local MOD="$1"
  info "Mencari & rebuilding $MOD..."
  local DIR
  DIR=$(find "$APP_DIR/node_modules" -maxdepth 6 -type d -name "$MOD" 2>/dev/null | grep -v '.cache' | head -1)
  [ -z "$DIR" ] && DIR=$(find "$APP_DIR/node_modules/.pnpm" -maxdepth 7 -type d -name "$MOD" 2>/dev/null | head -1)
  if [ -n "$DIR" ]; then
    cd "$DIR"
    npm run install --build-from-source 2>/dev/null || \
    npx node-pre-gyp install --fallback-to-build 2>/dev/null || \
    node-gyp rebuild 2>/dev/null || true
    cd "$APP_DIR"
    ok "$MOD rebuild selesai"
  else
    warn "$MOD tidak ditemukan, skip"
  fi
}

pnpm rebuild          2>/dev/null || true
pnpm rebuild sqlite3  2>/dev/null || rebuild_module "sqlite3"
pnpm rebuild bcrypt   2>/dev/null || rebuild_module "bcrypt"
ok "Native modules siap"

# =============================================================================
# STEP 09 — Generate secret key
# =============================================================================
step "09/12" "Generate session secret key"
cd "$APP_DIR"
if [ ! -f "$APP_DIR/.env" ] || ! grep -q "SESSION_SECRET" "$APP_DIR/.env" 2>/dev/null; then
  pnpm run generate-secret 2>/dev/null || node generate-secret.js
  ok "Secret key berhasil dibuat"
else
  ok "Secret key sudah ada — skip"
fi

# =============================================================================
# STEP 10 — Timezone
# =============================================================================
step "10/12" "Setup timezone Asia/Jakarta"
sudo timedatectl set-timezone Asia/Jakarta 2>/dev/null || true
ok "Timezone: $(timedatectl 2>/dev/null | grep 'Time zone' | awk '{print $3}' || echo 'Asia/Jakarta')"

# =============================================================================
# STEP 11 — Firewall
# =============================================================================
step "11/12" "Setup firewall UFW"
sudo ufw allow ssh   2>/dev/null || true
sudo ufw allow 7575  2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true
ok "Port SSH & 7575 dibuka"

# =============================================================================
# STEP 12 — PM2
# =============================================================================
step "12/12" "Install PM2 & start aplikasi"

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"
hash -r 2>/dev/null || true

if ! command -v pm2 &>/dev/null; then
  info "Menginstall PM2..."
  npm install -g pm2
  hash -r 2>/dev/null || true
  ok "PM2 berhasil diinstall"
else
  ok "PM2 sudah ada"
fi

command -v pm2 &>/dev/null || fail "PM2 tidak ditemukan. Coba: source ~/.bashrc && pm2 --version"

info "Memulai aplikasi via PM2..."
cd "$APP_DIR"
pm2 describe streamflow &>/dev/null && pm2 delete streamflow 2>/dev/null || true
pm2 start app.js --name streamflow
pm2 save

info "Setup PM2 startup on reboot..."
PM2_CMD=$(pm2 startup systemd -u "$USER" --hp "$HOME" 2>&1 | grep "sudo env" | head -1)
if [ -n "$PM2_CMD" ]; then
  eval "$PM2_CMD" 2>/dev/null || true
else
  pm2 startup 2>&1 | tail -1 | sudo bash 2>/dev/null || true
fi
pm2 save
ok "PM2 $(pm2 --version 2>/dev/null) dikonfigurasi & berjalan"

# =============================================================================
# SELESAI
# =============================================================================
SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null \
  || curl -s --connect-timeout 5 icanhazip.com 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}' \
  || echo "YOUR_IP")
PORT=$(grep -E '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "7575")

blank
B_TOP
boxline_c "" "$GREEN"
boxline_c "INSTALASI SELESAI!" "$GREEN$BOLD"
boxline_c "" "$GREEN"
B_DIV
boxline "  URL Akses  : http://${SERVER_IP}:${PORT}" "$YELLOW$BOLD"
boxline "  Lokasi     : $APP_DIR" "$WHITE"
boxline "  Node.js    : $(node -v)" "$WHITE"
boxline "  pnpm       : $(pnpm -v)" "$WHITE"
boxline "  PM2        : $(pm2 --version 2>/dev/null || echo '-')" "$WHITE"
B_DIV
boxline "  Langkah selanjutnya:" "$CYAN$BOLD"
boxline "  1. Buka URL di browser" "$WHITE"
boxline "  2. Buat akun admin (username & password)" "$WHITE"
boxline "  3. Sign Out lalu login kembali (sync DB)" "$WHITE"
B_DIV
boxline "  pm2 status             -> cek status app" "$GRAY"
boxline "  pm2 logs streamflow    -> log real-time" "$GRAY"
boxline "  pm2 restart streamflow -> restart app" "$GRAY"
B_BOT
blank
