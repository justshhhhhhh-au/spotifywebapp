# Sparx Media — Multi-Platform Web Music Player

Spotify-style dark player UI for **Justin Shu’s “sneaky!!” jam**, with:

- **Local music** — drag & drop or “+ Add Local Music” (MP3, WAV, FLAC, M4A, OGG, AAC)
- **Multi-platform sources** — Local (live) + Spotify / YouTube Music / Apple Music / SoundCloud (connect stubs ready for real OAuth)
- Cover art from the Trump × Elon “cigar office” playlist aesthetic

## Repo

https://github.com/justshhhhhhh-au/spotifywebapp

## Run locally (30 seconds)

```bash
git clone https://github.com/justshhhhhhh-au/spotifywebapp.git
cd spotifywebapp
npx serve .
# or: python3 -m http.server 3000
```

Open the URL it prints (usually http://localhost:3000).

## Deploy yourself

### GitHub Pages
1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch** → `main` / `/ (root)`
3. Live at `https://justshhhhhhh-au.github.io/spotifywebapp/`

### Vercel (Sparx-ai team)
```bash
npx vercel --prod
```
(Requires team deploy permissions — link the GitHub repo in Vercel dashboard if the API role blocks CLI.)

## Features

| Feature | Status |
|---------|--------|
| Local file playback | ✅ Full (File API + blob URLs) |
| Drag & drop audio | ✅ |
| Playlist hero + track list (sneaky!!) | ✅ |
| Now playing bar, seek, volume | ✅ |
| Shuffle / repeat / like | ✅ |
| Search | ✅ |
| Keyboard (Space, ← →) | ✅ |
| Responsive mobile | ✅ |
| Real Spotify Web Playback / MusicKit | 🔌 Stubs — wire OAuth + SDKs |

Demo tracks mirror the UI from your screenshots; they animate progress for UX. Drop real files for actual audio.

## Stack

Vanilla HTML / CSS / JS — zero build step. Easy to embed in sparx-ai.com or expand into Next.js later.

## Next upgrades (when you want them)

1. Spotify Web Playback SDK + PKCE  
2. IndexedDB library persistence  
3. Media Session API (lock screen controls)  
4. Folder import via File System Access API  
5. YouTube Music / MusicKit connectors  

Built for **sparx-ai / justshhhhhhh-au**.
