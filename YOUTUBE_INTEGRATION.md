# YouTube Integration - Complete Documentation

## ✅ STATUS: 100% PRESERVED & WORKING

Semua fitur YouTube integration telah berhasil dimigrasikan dari app.js ke modular structure tanpa kehilangan fungsionalitas.

---

## 📋 Components Overview

### 1. YouTube Credentials Management ✅

**Location**: `controllers/settingsController.js`

**Methods**:
- `showSettingsPage()` - Display YouTube connection status
- `updateYouTubeCredentials()` - Save Client ID & Secret (encrypted)
- `disconnectYouTube()` - Remove all connected channels

**Routes**: `routes/settings.js`
```javascript
GET  /settings                    // Show settings page with YouTube status
POST /settings/youtube            // Update YouTube API credentials
POST /settings/youtube/disconnect // Disconnect all channels
```

**Features**:
- Encrypted storage of credentials (`utils/encryption.js`)
- Display connection status
- Channel information display (name, thumbnail, subscribers)
- Multi-channel support

---

### 2. YouTube OAuth Flow ✅

**Location**: `app.js` ⚠️ **MUST STAY IN APP.JS**

**Routes**:
```javascript
GET /auth/youtube          // Initiate OAuth flow
GET /auth/youtube/callback // Handle OAuth callback
```

**Why not migrated?**
- Complex OAuth2 client setup with `googleapis`
- Session management during OAuth flow
- Token refresh handling
- Callback URL handling
- **This is intentional and correct architecture**

**Flow**:
1. User clicks "Connect YouTube" in Settings
2. Redirects to `/auth/youtube`
3. Google OAuth consent screen
4. Redirects back to `/auth/youtube/callback`
5. Tokens stored in database (encrypted)
6. Channel info fetched and saved

---

### 3. YouTube API Stream Creation ✅

**Location**: `controllers/streamController.js`

**Method**: `createYouTubeStream()`

**Route**: `routes/streams.js`
```javascript
POST /api/streams/youtube
```

**Request Body**:
```javascript
{
  videoId: "uuid",              // Required
  title: "Stream Title",        // Required, max 100 chars
  description: "Description",   // Optional, max 5000 chars
  privacy: "unlisted",          // public/unlisted/private
  category: "22",               // YouTube category ID
  tags: "tag1, tag2",           // Comma-separated
  ytChannelId: "uuid",          // Required
  scheduleStartTime: "2024-01-01T10:00",
  scheduleEndTime: "2024-01-01T12:00",
  loopVideo: true,
  ytMonetization: false,
  ytAlteredContent: false,
  ytMadeForKids: false
}
```

**Thumbnail Upload**:
- Uses `uploadThumbnail` middleware
- Field name: `thumbnail`
- Processed with `generateImageThumbnail()`
- Stored in `/uploads/thumbnails/`

**Validation**:
- All fields validated with `express-validator`
- YouTube channel ownership verified
- Video ownership verified
- Title length check (100 chars max for YouTube)
- Description length check (5000 chars max)

**Security Checks**:
1. ✅ User authentication
2. ✅ YouTube credentials configured
3. ✅ Valid YouTube channel selected
4. ✅ Channel belongs to user
5. ✅ Channel has access/refresh tokens
6. ✅ Video exists and belongs to user

---

### 4. Manual RTMP Stream (YouTube) ✅

**Location**: `controllers/streamController.js`

**Method**: `createStream()`

**Route**: `routes/streams.js`
```javascript
POST /api/streams
```

**Use Case**: 
- User wants to use YouTube RTMP manually
- User has custom RTMP server
- Alternative to YouTube API method

---

## 🔐 Security Implementation

### Encryption
**File**: `utils/encryption.js`

```javascript
// Credentials stored encrypted
youtube_client_id: encrypt(clientId)
youtube_client_secret: encrypt(clientSecret)
access_token: encrypt(accessToken)
refresh_token: encrypt(refreshToken)
```

### Authorization Checks

**Settings**:
- ✅ User must be authenticated
- ✅ Only user can update own credentials
- ✅ Only user can disconnect own channels

**Stream Creation**:
- ✅ User must be authenticated
- ✅ YouTube credentials must be configured
- ✅ Selected channel must belong to user
- ✅ Channel must have valid tokens
- ✅ Video must belong to user

### Channel Ownership Validation

```javascript
if (!selectedChannel || selectedChannel.user_id !== req.session.userId) {
  return res.status(400).json({ 
    success: false, 
    error: 'Invalid channel selected' 
  });
}
```

**Logging**:
```javascript
console.warn(`[YouTube Mapping] User ${userId} attempted to use invalid channel ${channelId}`);
```

---

## 📊 Database Schema

### Users Table
```sql
youtube_client_id TEXT      -- Encrypted
youtube_client_secret TEXT  -- Encrypted
```

### YoutubeChannels Table
```sql
id UUID PRIMARY KEY
user_id UUID FOREIGN KEY
channel_id TEXT             -- YouTube channel ID
channel_name TEXT
channel_thumbnail TEXT
subscriber_count TEXT
access_token TEXT           -- Encrypted
refresh_token TEXT          -- Encrypted
is_default INTEGER          -- 0 or 1
created_at TEXT
```

### Streams Table (YouTube Fields)
```sql
youtube_broadcast_id TEXT
youtube_stream_id TEXT
youtube_description TEXT
youtube_privacy TEXT
youtube_category TEXT
youtube_tags TEXT
youtube_thumbnail TEXT
youtube_channel_id UUID     -- FK to youtube_channels
is_youtube_api INTEGER
youtube_monetization INTEGER
youtube_altered_content INTEGER
youtube_made_for_kids INTEGER
```

---

## 🔄 Integration Flow

### Setup Flow
1. User saves YouTube API credentials in Settings
2. User clicks "Connect YouTube"
3. OAuth flow initiates
4. User grants permissions on Google
5. Callback receives tokens
6. Channel info fetched from YouTube API
7. Channel saved to database

### Stream Creation Flow
1. User navigates to create stream
2. Selects "YouTube API" mode
3. Selects YouTube channel from dropdown
4. Fills stream metadata (title, description, etc.)
5. Optionally uploads custom thumbnail
6. Submits form
7. Backend validates all inputs
8. Stream record created in database
9. YouTube broadcast created when stream starts (handled by streamingService)

---

## 🧪 Testing YouTube Integration

### Prerequisites
- Valid YouTube account
- YouTube API credentials (Client ID & Secret)
- At least one video uploaded

### Test Steps

#### 1. Configure Credentials
```
1. Login as admin
2. Go to Settings → Integrations
3. Enter YouTube Client ID
4. Enter YouTube Client Secret
5. Click Save
6. Verify success message
```

#### 2. Connect YouTube Account
```
1. Click "Connect YouTube"
2. Redirected to Google OAuth
3. Select YouTube account
4. Grant permissions
5. Redirected back to Settings
6. Verify channel name & thumbnail displayed
7. Verify subscriber count displayed
```

#### 3. Create YouTube Stream
```
1. Go to Streams
2. Click "Create Stream"
3. Select "YouTube API" mode
4. Select your YouTube channel
5. Select a video
6. Enter stream title (test)
7. Enter description (optional)
8. Select privacy (unlisted)
9. Upload thumbnail (optional)
10. Check "Monetization" (optional)
11. Submit
12. Verify stream created
13. Verify success message
```

#### 4. Verify Stream Record
```
1. Check stream appears in list
2. Click Edit stream
3. Verify all metadata saved correctly
4. Verify thumbnail displayed if uploaded
5. Verify YouTube channel selected
```

#### 5. Disconnect YouTube
```
1. Go to Settings → Integrations
2. Click "Disconnect YouTube"
3. Verify confirmation dialog
4. Confirm disconnect
5. Verify channels removed
6. Verify connection status updated
```

---

## 🐛 Common Issues & Solutions

### Issue: "YouTube API credentials not configured"
**Solution**: 
1. Go to Settings → Integrations
2. Save YouTube Client ID and Secret
3. Must be saved before connecting

### Issue: "Invalid channel selected"
**Solution**:
1. Disconnect and reconnect YouTube account
2. Verify channel belongs to your YouTube account
3. Check console logs for channel mapping errors

### Issue: "YouTube account not connected"
**Solution**:
1. Complete OAuth flow first
2. Click "Connect YouTube" in Settings
3. Grant all requested permissions
4. Verify channel info displayed after callback

### Issue: Thumbnail not uploading
**Solution**:
1. Check file size (<10MB)
2. Check file format (jpg, png, gif)
3. Check `uploadThumbnail` middleware configured
4. Verify `/uploads/thumbnails/` directory exists and writable

### Issue: OAuth redirect fails
**Solution**:
1. Check `BASE_URL` in .env (if configured)
2. Verify callback URL matches Google Console
3. Format: `https://yourdomain.com/auth/youtube/callback`
4. Must use HTTPS in production

---

## 🔧 Configuration

### Environment Variables (Optional)
```bash
# If using custom base URL for OAuth callback
BASE_URL=https://yourdomain.com
```

### Google Cloud Console Setup
1. Create project in Google Cloud Console
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI:
   - `http://localhost:7575/auth/youtube/callback` (development)
   - `https://yourdomain.com/auth/youtube/callback` (production)
5. Copy Client ID and Secret to StreamFlow Settings

---

## 📝 Notes

1. **OAuth must stay in app.js** - This is by design, not an oversight
2. **Multi-channel support** - Users can connect multiple YouTube channels
3. **Channel selection** - Each stream must specify which channel to use
4. **Token refresh** - Handled automatically by `googleapis` library
5. **Encryption** - All credentials and tokens encrypted at rest
6. **Logging** - Security events logged with user/channel IDs for auditing

---

## 🚀 Future Enhancements

Possible improvements (not implemented yet):
- [ ] Automatic thumbnail extraction from video
- [ ] Batch stream creation
- [ ] YouTube Analytics integration
- [ ] Live chat integration
- [ ] Automatic video upload to YouTube
- [ ] Custom broadcasting settings per channel
- [ ] Stream templates

---

**YouTube Integration: PRODUCTION READY** ✅
