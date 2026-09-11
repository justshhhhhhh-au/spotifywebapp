# Sparx Media – Multi-Platform Web Music Player

A beautiful, Spotify-inspired web music & media player that:

- **Plays local music** from your device (File API + drag-and-drop)
- **Connects to multiple platforms** (Spotify, YouTube Music, Apple Music, SoundCloud) — OAuth-ready stubs
- Matches the custom **"sneaky!!"** playlist UI (Justin Shu’s Jam cover art)

## Live demo

Deployed via Vercel from this repo.

## Features

| Feature | Status |
|---------|--------|
| Local MP3/WAV/FLAC/M4A/OGG playback | ✅ Full |
| Drag & drop files | ✅ |
| Playlist UI (sneaky!!) | ✅ |
| Now-playing bar, seek, volume, shuffle, repeat | ✅ |
| Search | ✅ |
| Keyboard shortcuts (Space, arrows) | ✅ |
| Responsive (mobile + desktop) | ✅ |
| Real Spotify / YT OAuth | 🔌 Stub (ready to wire Web Playback SDK / APIs) |

## Quick start (local)

```bash
# any static server
npx serve .
# or
python3 -m http.server 3000
```

Open http://localhost:3000

## Add real platform streaming

1. **Spotify** – Spotify Web Playback SDK + Authorization Code with PKCE  
2. **YouTube Music** – unofficial clients or YouTube IFrame API for videos  
3. **Apple Music** – MusicKit JS  
4. **SoundCloud** – SC Widget / API  

Backend recommended for token exchange. Local files already work fully offline.

## Credits

UI inspired by Justin Shu’s custom Spotify playlist screenshots featuring the Trump × Elon “cigar office” art.  
Built for sparx-ai / justshhhhhhh-au.

## License

MIT
