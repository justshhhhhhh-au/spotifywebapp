import type { SpotifyTokens, Track } from "./types";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export function getRedirectUri() {
  return `${APP_URL.replace(/\/$/, "")}/api/spotify/callback`;
}

export function hasSpotifyConfig() {
  return Boolean(CLIENT_ID && CLIENT_ID !== "your_spotify_client_id");
}

export function getClientId() {
  return CLIENT_ID;
}

export async function spotifyFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function mapSpotifyTrack(item: any): Track {
  const t = item.track || item;
  return {
    id: t.id || item.id,
    title: t.name,
    artist: (t.artists || []).map((a: any) => a.name).join(", "),
    album: t.album?.name,
    duration: Math.round((t.duration_ms || 0) / 1000),
    cover: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "/album-art.jpg",
    source: "spotify",
    uri: t.uri,
  };
}

export function tokensFromResponse(data: any): SpotifyTokens {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || "Bearer",
    scope: data.scope,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 30_000,
  };
}
