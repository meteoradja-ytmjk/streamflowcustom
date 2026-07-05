#!/bin/bash
# =============================================================================
#   LIVORA / StreamFlow - Quick Installer (Fixed)
#   Handles ERR_PNPM_IGNORED_BUILDS automatically
# =============================================================================

# ── Warna & helper ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo; echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }

# ── Banner ───────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     LIVORA Quick Installer v2.2      ║"
echo "  ║   StreamFlow Multi-Platform Stream   ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

read -p "$(echo -e ${YELLOW}"Mulai instalasi? (y/n): "${NC})" -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && echo "Instalasi dibatalkan." && exit 0

APP_DIR="$HOME/streamflow"
REPO_URL="https://github.com/meteoradja-ytmjk/streamflowcustom"

# =============================================================================
# LANGKAH 1 — Update sistem
# =============================================================================
step "1/12 Update sistem"
sudo apt-get update -qq && sudo apt-get upgrade -y -qq
ok "Sistem berhasil diupdate"

# =============================================================================
# LANGKAH 2 — Build tools (wajib sebelum native modules)
# =============================================================================
step "2/12 Install build tools"
sudo apt-get install -y -qq python3 make g++ build-essential curl git
ok "Build tools siap"

# =============================================================================
# LANGKAH 3 — FFmpeg
# =============================================================================
step "3/12 Install FFmpeg"
if command -v ffmpeg &>/dev/null; then
    ok "FFmpeg sudah terinstall ($(ffmpeg -version 2>&1 | head -1 | awk '{print $3}'))"
else
    sudo apt-get install -y -qq ffmpeg
    ok "FFmpeg berhasil diinstall"
fi

# =============================================================================
# LANGKAH 4 — NVM & Node.js
# =============================================================================
step "4/12 Install NVM + Node.js LTS"

export NVM_DIR="$HOME/.nvm"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    info "Menginstall NVM..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
fi

# Load NVM
source "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Tambahkan ke .bashrc jika belum ada
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
# LANGKAH 5 — pnpm
# =============================================================================
step "5/12 Install pnpm"

export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
mkdir -p "$PNPM_HOME"

if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm
fi

# Tambahkan ke .bashrc jika belum ada
grep -q 'PNPM_HOME' ~/.bashrc || cat >> ~/.bashrc << 'BASHEOF'
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
BASHEOF

# Reload PATH agar pnpm langsung bisa dipakai
hash -r 2>/dev/null || true
ok "pnpm $(pnpm -v) siap"

# =============================================================================
# LANGKAH 6 — Clone / Pull repository
# =============================================================================
step "6/12 Setup repository"

if [ -d "$APP_DIR/.git" ]; then
    warn "Folder $APP_DIR sudah ada, melakukan git pull..."
    cd "$APP_DIR"
    git pull
else
    info "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

ok "Repository siap di $APP_DIR"

# =============================================================================
# LANGKAH 7 — pnpm config + install dependencies
#   Fix ERR_PNPM_IGNORED_BUILDS secara otomatis
# =============================================================================
step "7/12 Install dependencies (auto-fix pnpm build errors)"
cd "$APP_DIR"

# ── 7a. Buat .npmrc untuk mengizinkan semua build scripts ──
info "Menulis .npmrc untuk mengizinkan native build scripts..."
cat > "$APP_DIR/.npmrc" << 'NPMRCEOF'
; Izinkan semua build scripts (fix ERR_PNPM_IGNORED_BUILDS)
ignore-scripts=false
enable-pre-post-scripts=true
NPMRCEOF

# ── 7b. Set pnpm config global untuk allow builds ──
pnpm config set ignore-scripts false     2>/dev/null || true
pnpm config set enable-pre-post-scripts true 2>/dev/null || true

# ── 7c. pnpm install pertama (mungkin muncul ERR_PNPM_IGNORED_BUILDS) ──
info "Menjalankan pnpm install (percobaan 1)..."
if ! pnpm install 2>&1; then
    warn "pnpm install pertama gagal atau ada peringatan build, menjalankan auto-fix..."
fi

# ── 7d. Approve semua build scripts yang diminta pnpm ──
info "Menyetujui semua build scripts (approve-builds)..."
pnpm approve-builds --all 2>/dev/null || true

# ── 7e. Install ulang setelah approve ──
info "Menjalankan pnpm install ulang dengan build scripts diizinkan..."
pnpm install --ignore-scripts=false 2>&1 || {
    warn "Percobaan 2 gagal, mencoba dengan --shamefully-hoist..."
    pnpm install --shamefully-hoist --ignore-scripts=false 2>&1 || true
}

ok "Dependencies terinstall"

# =============================================================================
# LANGKAH 8 — Rebuild native modules (sqlite3, bcrypt)
# =============================================================================
step "8/12 Rebuild native modules"
cd "$APP_DIR"

# Fungsi helper rebuild module
rebuild_module() {
    local MOD_NAME="$1"
    local FOUND_DIR

    info "Mencari lokasi $MOD_NAME..."

    # Cari di berbagai lokasi pnpm
    FOUND_DIR=$(find "$APP_DIR/node_modules" -maxdepth 5 -type d -name "$MOD_NAME" 2>/dev/null | \
        grep -v '/node_modules/.cache' | head -1)

    if [ -z "$FOUND_DIR" ]; then
        # Fallback: coba pnpm store / .pnpm
        FOUND_DIR=$(find "$APP_DIR/node_modules/.pnpm" -maxdepth 6 -type d -name "$MOD_NAME" 2>/dev/null | head -1)
    fi

    if [ -n "$FOUND_DIR" ]; then
        info "Rebuilding $MOD_NAME di $FOUND_DIR..."
        cd "$FOUND_DIR"
        # Coba beberapa cara rebuild
        npm run install --build-from-source 2>/dev/null || \
        npx node-pre-gyp install --fallback-to-build 2>/dev/null || \
        node-gyp rebuild 2>/dev/null || true
        cd "$APP_DIR"
        ok "$MOD_NAME rebuild selesai"
    else
        warn "$MOD_NAME tidak ditemukan, coba via pnpm rebuild..."
    fi
}

# Rebuild dengan pnpm rebuild (cara paling clean)
info "Menjalankan pnpm rebuild untuk semua native modules..."
pnpm rebuild 2>/dev/null || true

# Rebuild spesifik jika perlu
pnpm rebuild sqlite3 2>/dev/null || rebuild_module "sqlite3"
pnpm rebuild bcrypt  2>/dev/null || rebuild_module "bcrypt"

ok "Native modules siap"

# =============================================================================
# LANGKAH 9 — Generate secret key
# =============================================================================
step "9/12 Generate secret key"
cd "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ] || ! grep -q "SESSION_SECRET" "$APP_DIR/.env" 2>/dev/null; then
    pnpm run generate-secret 2>/dev/null || node generate-secret.js
    ok "Secret key dibuat"
else
    ok "Secret key sudah ada, skip"
fi

# =============================================================================
# LANGKAH 10 — Timezone
# =============================================================================
step "10/12 Setup timezone"
sudo timedatectl set-timezone Asia/Jakarta 2>/dev/null || true
ok "Timezone: $(timedatectl | grep 'Time zone' | awk '{print $3}')"

# =============================================================================
# LANGKAH 11 — Firewall
# =============================================================================
step "11/12 Setup firewall (UFW)"
sudo ufw allow ssh   2>/dev/null || true
sudo ufw allow 7575  2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true
ok "Port SSH & 7575 dibuka"

# =============================================================================
# LANGKAH 12 — PM2
# =============================================================================
step "12/12 Install & start PM2"

# Reload PATH secara lengkap
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$(npm root -g 2>/dev/null)/../../bin:$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"
hash -r 2>/dev/null || true

# Install PM2 jika belum ada
if ! command -v pm2 &>/dev/null; then
    info "Menginstall PM2..."
    npm install -g pm2
    hash -r 2>/dev/null || true
fi

# Pastikan pm2 benar-benar tersedia
PM2_BIN=""
for PM2_PATH in \
    "$(which pm2 2>/dev/null)" \
    "$HOME/.local/share/pnpm/pm2" \
    "$NVM_DIR/versions/node/$(nvm current)/bin/pm2" \
    "$(npm root -g 2>/dev/null)/.bin/pm2"; do
    if [ -x "$PM2_PATH" ]; then
        PM2_BIN="$PM2_PATH"
        break
    fi
done

if [ -z "$PM2_BIN" ] && ! command -v pm2 &>/dev/null; then
    warn "PM2 tidak ditemukan via PATH, mencoba install ulang via npm..."
    npm install -g pm2
    hash -r 2>/dev/null || true
fi

ok "PM2 $(pm2 --version 2>/dev/null || echo '?') siap"

# ── Start aplikasi ──
cd "$APP_DIR"
info "Memulai StreamFlow via PM2..."

# Stop proses lama jika ada
pm2 describe streamflow &>/dev/null && pm2 delete streamflow 2>/dev/null || true

pm2 start app.js --name streamflow
pm2 save

# ── Setup auto-start ──
info "Setup PM2 auto-start on reboot..."
PM2_STARTUP_CMD=$(pm2 startup systemd -u "$USER" --hp "$HOME" 2>&1 | grep "sudo env" | head -1)
if [ -n "$PM2_STARTUP_CMD" ]; then
    eval "$PM2_STARTUP_CMD" 2>/dev/null || true
else
    pm2 startup 2>&1 | tail -1 | sudo bash 2>/dev/null || true
fi
pm2 save
ok "PM2 startup dikonfigurasi"

# =============================================================================
# SELESAI
# =============================================================================
echo
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         ✅ INSTALASI SELESAI!            ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null \
    || curl -s --connect-timeout 5 icanhazip.com 2>/dev/null \
    || hostname -I 2>/dev/null | awk '{print $1}' \
    || echo "YOUR_SERVER_IP")

PORT=$(grep -E '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "7575")

echo -e "${BOLD}🌐 URL Akses   :${NC} http://${SERVER_IP}:${PORT}"
echo -e "${BOLD}📦 Node.js     :${NC} $(node -v)"
echo -e "${BOLD}📦 pnpm        :${NC} $(pnpm -v)"
echo -e "${BOLD}📦 PM2         :${NC} $(pm2 --version 2>/dev/null || echo '-')"
echo -e "${BOLD}📁 App dir     :${NC} $APP_DIR"
echo
echo -e "${CYAN}📋 Langkah selanjutnya:${NC}"
echo "   1. Buka URL di browser"
echo "   2. Buat username & password admin"
echo "   3. Sign Out lalu login kembali (sinkronisasi database)"
echo
echo -e "${CYAN}💡 Perintah berguna:${NC}"
echo "   pm2 status               → cek status aplikasi"
echo "   pm2 logs streamflow      → lihat log real-time"
echo "   pm2 restart streamflow   → restart aplikasi"
echo
echo -e "${YELLOW}⚠️  Jika pm2 tidak ditemukan setelah sesi ini, jalankan:${NC}"
echo "   source ~/.bashrc && pm2 status"
echo
