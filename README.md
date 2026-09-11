# Sparx Media v2 — Next.js + Spotify OAuth + Embed

Multi-platform web music player for **Justin Shu / Sparx-ai**.

- **Next.js 16** App Router + Tailwind
- **Local files** — drag/drop + picker (real playback)
- **Spotify OAuth PKCE** — real login, playlists + saved tracks
- **`/embed`** — iframe-friendly player for Sparx pages
- **`/embed.js`** — one-line widget script

## Quick start

```bash
git clone https://github.com/justshhhhhhh-au/spotifywebapp.git
cd spotifywebapp
npm install
cp .env.example .env.local
# edit NEXT_PUBLIC_SPOTIFY_CLIENT_ID + NEXT_PUBLIC_APP_URL
npm run dev
```

Open http://localhost:3000

## Spotify setup (5 min)

1. https://developer.spotify.com/dashboard → Create app  
2. Redirect URI: `http://localhost:3000/api/spotify/callback`  
   (prod: `https://YOUR-DOMAIN/api/spotify/callback`)  
3. Copy **Client ID** into `.env.local`:

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=xxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Restart dev server → sidebar **Spotify → Connect**

PKCE works without a client secret for public apps. Optional `SPOTIFY_CLIENT_SECRET` for confidential apps.

> In-browser Spotify **streaming** still needs Premium + Web Playback SDK device (next upgrade). OAuth already unlocks library/playlists via Web API.

## Embed on a Sparx page

### iframe

```html
<iframe
  src="https://YOUR-DOMAIN/embed"
  width="100%"
  height="520"
  style="border:0;border-radius:12px"
  allow="autoplay; encrypted-media"
></iframe>
```

### widget script

```html
<div id="sparx-media" data-height="520"></div>
<script src="https://YOUR-DOMAIN/embed.js" async></script>
```

Allow framing: `/embed` ships with open `frame-ancestors *`.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Full player |
| `/embed` | Compact embed UI |
| `/api/spotify/login` | Start PKCE |
| `/api/spotify/callback` | Token exchange |
| `/api/spotify/refresh` | Refresh access token |
| `/api/spotify/me` | Profile + playlists + saved tracks |
| `/embed.js` | Widget loader |

## Deploy (Vercel)

```bash
npx vercel --prod
```

Set env vars in project settings. Add production redirect URI in Spotify dashboard.

## v1 static app

Original vanilla HTML player remains on earlier commits if needed. This branch is the Next.js rewrite.

## Next

- Spotify Web Playback SDK device
- MusicKit / YouTube connectors  
- IndexedDB local library  
- Media Session API  

MIT · sparx-ai / justshhhhhhh-au
