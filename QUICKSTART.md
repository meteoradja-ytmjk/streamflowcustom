# ⚡ Quick Start Guide - StreamFlow

Get StreamFlow up and running in 5 minutes!

## 🎯 Overview

StreamFlow adalah platform streaming yang memungkinkan Anda:
- ✅ Stream ke multiple platform secara bersamaan
- ✅ Manage video library dengan mudah
- ✅ Schedule streaming otomatis
- ✅ Monitor streaming real-time

---

## 📦 Quick Installation

### Option 1: Automatic Installation (Linux/Mac)

```bash
curl -o install.sh https://raw.githubusercontent.com/meteoradja-ytmjk/streamflowcustom/main/install.sh && chmod +x install.sh && ./install.sh
```

### Option 2: Manual Installation

#### For Windows:

```cmd
# Clone repository
git clone https://github.com/meteoradja-ytmjk/streamflowcustom.git
cd streamflowcustom

# Install dependencies
npm install --legacy-peer-deps

# Generate secret key
node generate-secret.js

# Start application
npm start
```

#### For Linux/Mac:

```bash
# Clone repository
git clone https://github.com/meteoradja-ytmjk/streamflowcustom.git
cd streamflowcustom

# Install dependencies
npm install

# Generate secret key
node generate-secret.js

# Start application
npm start
```

### Option 3: Docker

```bash
# Clone repository
git clone https://github.com/meteoradja-ytmjk/streamflowcustom.git
cd streamflowcustom

# Create .env file
cp .env.example .env

# Start with Docker
docker-compose up -d
```

---

## 🚀 First Time Setup

### 1. Access Application

Open your browser and navigate to:
- Local: `http://localhost:7575`
- Network: `http://YOUR-IP:7575`

### 2. Create Admin Account

First time you access StreamFlow, you'll see the **Setup Account** page:

1. Enter **Username** (min. 3 characters)
2. Enter **Password** (min. 8 characters, must include uppercase, lowercase, and number)
3. Confirm **Password**
4. Upload **Avatar** (optional)
5. Click **Create Account**

✅ Your admin account is now created!

### 3. Login

Use your credentials to login to the dashboard.

---

## 📚 Basic Usage

### Upload Video

1. Go to **Gallery** menu
2. Click **Upload Video** button
3. Choose video file or drag & drop
4. Fill in video details (optional)
5. Click **Upload**

### Create Stream

1. Go to **Dashboard**
2. Click **Create Stream** button
3. Fill in stream details:
   - **Title**: Stream name
   - **Platform**: Select platform (YouTube, Facebook, etc.)
   - **RTMP URL**: Your streaming server URL
   - **Stream Key**: Your streaming key
   - **Video**: Select video from gallery
4. Configure stream settings:
   - **Resolution**: 1920x1080, 1280x720, etc.
   - **Bitrate**: 2500 kbps recommended
   - **FPS**: 30 or 60
5. Click **Start Stream**

### Schedule Stream

1. Create or edit a stream
2. Enable **Schedule Stream** toggle
3. Set date and time
4. Choose schedule type:
   - **Once**: Single scheduled stream
   - **Daily**: Repeat every day
   - **Weekly**: Select specific days
5. Click **Save**

---

## 🎮 Platform Setup

### YouTube Streaming

1. Go to [YouTube Studio](https://studio.youtube.com)
2. Click **Go Live**
3. Select **Stream** tab
4. Copy **Stream URL** and **Stream Key**
5. Paste to StreamFlow stream configuration

**YouTube RTMP URL:**
```
rtmps://a.rtmp.youtube.com/live2
```

### Facebook Live

1. Go to [Facebook Live Producer](https://www.facebook.com/live/producer)
2. Click **Go Live**
3. Copy **Server URL** and **Stream Key**
4. Paste to StreamFlow stream configuration

### Twitch

1. Go to [Twitch Dashboard](https://dashboard.twitch.tv)
2. Settings → Stream
3. Copy **Server URL** and **Stream Key**
4. Paste to StreamFlow stream configuration

### Custom RTMP

For custom RTMP servers:
```
rtmp://your-server.com/live
Stream Key: your-stream-key
```

---

## 🎨 Dashboard Overview

### Main Dashboard
- **Active Streams**: View all live streams
- **Stream History**: Past streaming sessions
- **Quick Stats**: System resources and metrics

### Gallery
- **Video Library**: All uploaded videos
- **Folders**: Organize videos in folders
- **Upload**: Add new videos
- **Delete**: Remove videos

### Streams
- **All Streams**: Manage all streams
- **Live**: Currently streaming
- **Scheduled**: Upcoming streams
- **Offline**: Inactive streams

### Settings
- **Profile**: Update account information
- **YouTube Integration**: Connect YouTube account
- **System**: Application settings

---

## 🛠️ Common Tasks

### Stop a Live Stream

1. Go to **Dashboard** or **Streams**
2. Find the active stream
3. Click **Stop Stream** button
4. Confirm stop action

### Edit Stream Configuration

1. Go to **Streams**
2. Click on stream card
3. Click **Edit** button
4. Update settings
5. Click **Save**

### Delete Video

1. Go to **Gallery**
2. Select video(s)
3. Click **Delete** button
4. Confirm deletion

⚠️ **Note**: Videos used in active streams cannot be deleted!

### Create Playlist

1. Go to **Playlists** menu
2. Click **Create Playlist**
3. Enter playlist name
4. Add videos to playlist
5. Enable **Shuffle** if needed
6. Click **Save**

### Use Playlist in Stream

1. Create or edit stream
2. Select **Video Type**: Playlist
3. Choose your playlist
4. Configure stream settings
5. Start streaming

---

## 🔐 Security Tips

### Change Default Port

Edit `.env` file:
```env
PORT=8080
```

Restart application:
```bash
pm2 restart streamflow
# or
npm start
```

### Enable HTTPS (Production)

1. Install SSL certificate with Certbot
2. Configure Nginx reverse proxy
3. Update `.env`:
```env
NODE_ENV=production
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed SSL setup.

### Regular Backups

Backup important files:
```bash
# Database
cp db/streamflow.db backups/

# Uploads
cp -r public/uploads/ backups/
```

---

## 📊 System Requirements

### Minimum
- 1 Core CPU
- 1GB RAM
- 10GB Storage
- Node.js v18+

### Recommended
- 2 Core CPU
- 4GB RAM
- 20GB Storage
- FFmpeg installed
- Stable internet (5 Mbps upload minimum)

---

## 🎯 Streaming Best Practices

### Video Quality
- **1080p**: 4500-6000 kbps, 30-60 fps
- **720p**: 2500-4000 kbps, 30-60 fps
- **480p**: 1000-2000 kbps, 30 fps

### Audio Quality
- Bitrate: 128-192 kbps
- Sample Rate: 44.1 kHz or 48 kHz
- Codec: AAC

### Network
- Stable connection recommended
- Upload speed > bitrate x 1.5
- Use wired connection when possible

---

## 🆘 Troubleshooting

### Can't Access Application

**Check if app is running:**
```bash
pm2 status
# or check process
netstat -tulpn | grep 7575
```

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 7575
```

### Stream Won't Start

1. ✅ Check RTMP URL and Stream Key
2. ✅ Verify video file is accessible
3. ✅ Check FFmpeg is installed: `ffmpeg -version`
4. ✅ Check application logs: `pm2 logs streamflow`

### Video Upload Fails

1. ✅ Check file size (max 50GB by default)
2. ✅ Check disk space: `df -h`
3. ✅ Verify file format (MP4, MKV, AVI, MOV, FLV)
4. ✅ Check upload folder permissions

### High CPU Usage

1. ✅ Reduce stream bitrate
2. ✅ Lower resolution
3. ✅ Stop inactive streams
4. ✅ Upgrade server resources

---

## 📞 Get Help

- 📖 [Full Documentation](README.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)
- 💻 [Windows Installation](INSTALLATION_NOTES.md)
- 🐛 [Report Issues](https://github.com/meteoradja-ytmjk/streamflowcustom/issues)

---

## 🎉 Next Steps

Now that you have StreamFlow running:

1. ✅ Upload your first video
2. ✅ Create your first stream
3. ✅ Schedule a stream
4. ✅ Explore advanced settings
5. ✅ Connect multiple platforms

**Happy Streaming! 🎬📹✨**

---

© 2026 StreamFlow - Built with ❤️
