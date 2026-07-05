#!/bin/bash
# =============================================================================
#   OZANG QUICK INSTALLER V.2.0 - STREAMING APP
#   Auto-handles ERR_PNPM_IGNORED_BUILDS
# =============================================================================

# ── Color palette ─────────────────────────────────────────────────────────────
BLACK='\033[0;30m';   RED='\033[0;31m';     GREEN='\033[0;32m'
YELLOW='\033[1;33m';  BLUE='\033[0;34m';    MAGENTA='\033[0;35m'
CYAN='\033[0;36m';    WHITE='\033[1;37m';   ORANGE='\033[38;5;214m'
PURPLE='\033[38;5;99m'
BOLD='\033[1m';       DIM='\033[2m';        ITALIC='\033[3m'
BLINK='\033[5m';      RESET='\033[0m';      NC='\033[0m'

# Background colors
BG_BLACK='\033[40m';  BG_CYAN='\033[46m';   BG_MAGENTA='\033[45m'
BG_BLUE='\033[44m';   BG_RED='\033[41m';    BG_GREEN='\033[42m'

# ── Helper functions ──────────────────────────────────────────────────────────
ok()     { echo -e " ${GREEN}${BOLD} ✔ ${NC} ${GREEN}$1${NC}"; }
info()   { echo -e " ${CYAN}${BOLD} ➜ ${NC} ${WHITE}$1${NC}"; }
warn()   { echo -e " ${YELLOW}${BOLD} ⚠ ${NC} ${YELLOW}$1${NC}"; }
fail()   { echo -e "\n ${RED}${BOLD} ✘ FATAL: $1${NC}\n"; exit 1; }
blank()  { echo ""; }

step() {
  local NUM="$1"
  local TEXT="$2"
  blank
  echo -e " ${BG_CYAN}${BLACK}${BOLD}  STEP $NUM  ${NC}${CYAN}${BOLD} $TEXT ${NC}"
  echo -e " ${CYAN}${DIM} ─────────────────────────────────────────────────────${NC}"
}

divider() {
  echo -e " ${DIM}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ── Animated dots ─────────────────────────────────────────────────────────────
loading() {
  local MSG="$1"
  local FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while true; do
    echo -ne " ${CYAN}${FRAMES[$i]}${NC} ${DIM}$MSG...${NC}\r"
    i=$(( (i+1) % ${#FRAMES[@]} ))
    sleep 0.1
  done
}

# ── Clear & Banner ────────────────────────────────────────────────────────────
clear

# Top glow line
echo -e "${CYAN}${DIM}"
echo "   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
echo -e "${NC}"

# Main ASCII banner box
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║                                                              ║"
echo -e "  ║${ORANGE}${BOLD}   ██████╗ ███████╗ █████╗ ███╗   ██╗ ██████╗             ${CYAN}║"
echo -e "  ║${ORANGE}${BOLD}  ██╔═══██╗╚══███╔╝██╔══██╗████╗  ██║██╔════╝             ${CYAN}║"
echo -e "  ║${ORANGE}${BOLD}  ██║   ██║  ███╔╝ ███████║██╔██╗ ██║██║  ███╗            ${CYAN}║"
echo -e "  ║${ORANGE}${BOLD}  ██║   ██║ ███╔╝  ██╔══██║██║╚██╗██║██║   ██║            ${CYAN}║"
echo -e "  ║${ORANGE}${BOLD}  ╚██████╔╝███████╗██║  ██║██║ ╚████║╚██████╔╝            ${CYAN}║"
echo -e "  ║${ORANGE}${BOLD}   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝            ${CYAN}║"
echo "  ║                                                              ║"
echo "  ╠══════════════════════════════════════════════════════════════╣"
echo -e "  ║  ${WHITE}${BOLD}   ⚡ QUICK INSTALLER V.2.0  ─  STREAMING APP  ⚡       ${CYAN}${BOLD}║"
echo "  ╠══════════════════════════════════════════════════════════════╣"
echo -e "  ║  ${DIM}${WHITE}  Auto-handles ERR_PNPM_IGNORED_BUILDS  •  PM2 Ready      ${CYAN}${BOLD}║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Bottom glow line
echo -e "${CYAN}${DIM}"
echo "   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
echo -e "${NC}"
blank

# System info row
echo -e " ${DIM}${WHITE}  OS  : $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || uname -s)${NC}"
echo -e " ${DIM}${WHITE}  CPU : $(nproc) Core(s)   RAM: $(free -h 2>/dev/null | awk '/^Mem/{print $2}' || echo 'N/A')${NC}"
echo -e " ${DIM}${WHITE}  USER: $USER   HOME: $HOME${NC}"

divider
blank

# Confirmation prompt
echo -ne " ${YELLOW}${BOLD}  Mulai instalasi? ${NC}${DIM}(y/n)${NC} ${CYAN}❯${NC} "
read -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  blank
  echo -e " ${RED}  Instalasi dibatalkan.${NC}"
  blank
  exit 0
fi

APP_DIR="$HOME/streamflow"
REPO_URL="https://github.com/meteoradja-ytmjk/streamflowcustom"

# =============================================================================
# STEP 1 — Update sistem
# =============================================================================
step "01/12" "Update & upgrade sistem"
info "Menjalankan apt update + upgrade..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq
ok "Sistem berhasil diupdate"

# =============================================================================
# STEP 2 — Build tools
# =============================================================================
step "02/12" "Install build tools (python3, gcc, make)"
info "Menginstall build-essential, python3, make, g++..."
sudo apt-get install -y -qq python3 make g++ build-essential curl git
ok "Build tools siap"

# =============================================================================
# STEP 3 — FFmpeg
# =============================================================================
step "03/12" "Install FFmpeg"
if command -v ffmpeg &>/dev/null; then
  FFVER=$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')
  ok "FFmpeg sudah terinstall — v$FFVER"
else
  info "Menginstall FFmpeg..."
  sudo apt-get install -y -qq ffmpeg
  ok "FFmpeg berhasil diinstall"
fi

# =============================================================================
# STEP 4 — NVM + Node.js
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
# STEP 5 — pnpm
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
# STEP 6 — Clone / Pull repository
# =============================================================================
step "06/12" "Setup repository aplikasi"

if [ -d "$APP_DIR/.git" ]; then
  warn "Folder $APP_DIR sudah ada — menjalankan git pull..."
  cd "$APP_DIR"
  git pull
else
  info "Cloning repository ke $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

ok "Repository siap"

# =============================================================================
# STEP 7 — Install dependencies (auto-fix pnpm build errors)
# =============================================================================
step "07/12" "Install dependencies (auto-fix ERR_PNPM_IGNORED_BUILDS)"
cd "$APP_DIR"

# 7a. Tulis .npmrc untuk izinkan native build scripts
info "Menulis konfigurasi .npmrc..."
cat > "$APP_DIR/.npmrc" << 'NPMEOF'
ignore-scripts=false
enable-pre-post-scripts=true
NPMEOF

# 7b. Set pnpm global config
pnpm config set ignore-scripts false           2>/dev/null || true
pnpm config set enable-pre-post-scripts true   2>/dev/null || true

# 7c. Install pertama
info "Menjalankan pnpm install (percobaan 1)..."
pnpm install 2>&1 || warn "Install pertama selesai dengan warning — menjalankan auto-fix..."

# 7d. Approve semua build scripts
info "Menyetujui semua build scripts..."
pnpm approve-builds --all 2>/dev/null || true

# 7e. Install ulang setelah approve
info "Menjalankan pnpm install ulang dengan build scripts diizinkan..."
pnpm install --ignore-scripts=false 2>&1 || {
  warn "Percobaan 2 gagal, mencoba dengan --shamefully-hoist..."
  pnpm install --shamefully-hoist --ignore-scripts=false 2>&1 || true
}

ok "Dependencies terinstall"

# =============================================================================
# STEP 8 — Rebuild native modules (sqlite3, bcrypt)
# =============================================================================
step "08/12" "Rebuild native modules (sqlite3, bcrypt)"
cd "$APP_DIR"

rebuild_module() {
  local MOD="$1"
  info "Mencari & rebuilding $MOD..."
  local DIR
  DIR=$(find "$APP_DIR/node_modules" -maxdepth 6 -type d -name "$MOD" 2>/dev/null | \
    grep -v '.cache' | head -1)
  if [ -z "$DIR" ]; then
    DIR=$(find "$APP_DIR/node_modules/.pnpm" -maxdepth 7 -type d -name "$MOD" 2>/dev/null | head -1)
  fi
  if [ -n "$DIR" ]; then
    cd "$DIR"
    npm run install --build-from-source 2>/dev/null || \
    npx node-pre-gyp install --fallback-to-build 2>/dev/null || \
    node-gyp rebuild 2>/dev/null || true
    cd "$APP_DIR"
    ok "$MOD rebuild selesai"
  else
    warn "$MOD tidak ditemukan secara manual, skip"
  fi
}

info "Menjalankan pnpm rebuild untuk semua native modules..."
pnpm rebuild 2>/dev/null || true
pnpm rebuild sqlite3 2>/dev/null || rebuild_module "sqlite3"
pnpm rebuild bcrypt  2>/dev/null || rebuild_module "bcrypt"

ok "Native modules siap"

# =============================================================================
# STEP 9 — Generate secret key
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

# Verifikasi pm2 tersedia
if ! command -v pm2 &>/dev/null; then
  fail "PM2 tidak ditemukan. Coba: export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 --version"
fi

info "Memulai StreamFlow via PM2..."
cd "$APP_DIR"

pm2 describe streamflow &>/dev/null && pm2 delete streamflow 2>/dev/null || true
pm2 start app.js --name streamflow
pm2 save

# Setup auto-start on reboot
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
# ── SELESAI ──────────────────────────────────────────────────────────────────
# =============================================================================
blank
blank
echo -e "${CYAN}${DIM}"
echo "   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
echo -e "${NC}"

echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║                                                              ║"
echo "  ║          🎉  INSTALASI BERHASIL SELESAI!  🎉                ║"
echo "  ║                                                              ║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null \
  || curl -s --connect-timeout 5 icanhazip.com 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}' \
  || echo "YOUR_IP")

PORT=$(grep -E '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "7575")

echo -e " ${WHITE}${BOLD}  ┌─ INFO AKSES ─────────────────────────────────────────────┐${NC}"
echo -e " ${WHITE}${BOLD}  │${NC}  ${CYAN}🌐 URL    :${NC} ${YELLOW}${BOLD}http://${SERVER_IP}:${PORT}${NC}"
echo -e " ${WHITE}${BOLD}  │${NC}  ${CYAN}📁 Lokasi :${NC} ${APP_DIR}"
echo -e " ${WHITE}${BOLD}  │${NC}  ${CYAN}📦 Node   :${NC} $(node -v)"
echo -e " ${WHITE}${BOLD}  │${NC}  ${CYAN}📦 pnpm   :${NC} $(pnpm -v)"
echo -e " ${WHITE}${BOLD}  │${NC}  ${CYAN}📦 PM2    :${NC} $(pm2 --version 2>/dev/null || echo '-')"
echo -e " ${WHITE}${BOLD}  └────────────────────────────────────────────────────────────${NC}"
blank

echo -e " ${YELLOW}${BOLD}  📋 LANGKAH SELANJUTNYA:${NC}"
echo -e "  ${DIM}  1.${NC} Buka URL di browser"
echo -e "  ${DIM}  2.${NC} Buat akun admin (username & password)"
echo -e "  ${DIM}  3.${NC} Sign Out → Login kembali (sinkronisasi database)"
blank

echo -e " ${CYAN}${BOLD}  ⚙  PERINTAH BERGUNA:${NC}"
echo -e "  ${DIM}  pm2 status                 ${NC}→ cek status aplikasi"
echo -e "  ${DIM}  pm2 logs streamflow        ${NC}→ lihat log real-time"
echo -e "  ${DIM}  pm2 restart streamflow     ${NC}→ restart aplikasi"
blank

echo -e " ${DIM}  Jika pm2 tidak ditemukan:${NC} ${ITALIC}source ~/.bashrc && pm2 status${NC}"
blank

echo -e "${CYAN}${DIM}"
echo "   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
echo -e "${NC}"
blank
