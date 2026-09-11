import { NextRequest, NextResponse } from "next/server";
import { mapSpotifyTrack, spotifyFetch } from "@/lib/spotify";
import type { SpotifyTokens } from "@/lib/types";

async function getAccessToken(req: NextRequest): Promise<string | null> {
  const raw = req.cookies.get("sp_tokens")?.value;
  if (!raw) return null;
  try {
    const tokens: SpotifyTokens = JSON.parse(raw);
    if (Date.now() >= tokens.expires_at) {
      // try refresh via internal call pattern — client should call /refresh first
      return null;
    }
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  let token = await getAccessToken(req);
  if (!token) {
    // attempt refresh
    const refresh = await fetch(new URL("/api/spotify/refresh", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (refresh.ok) {
      const j = await refresh.json();
      token = j.access_token;
    }
  }
  if (!token) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  try {
    const me = await spotifyFetch("/me", token);
    const playlists = await spotifyFetch("/me/playlists?limit=20", token);
    const saved = await spotifyFetch("/me/tracks?limit=20", token);

    const tracks = (saved?.items || []).map(mapSpotifyTrack);

    return NextResponse.json({
      connected: true,
      user: {
        id: me.id,
        name: me.display_name,
        image: me.images?.[0]?.url,
        product: me.product,
      },
      playlists: (playlists?.items || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        images: p.images,
        tracks: p.tracks?.total,
      })),
      recentSaved: tracks,
    });
  } catch (e: any) {
    return NextResponse.json(
      { connected: false, error: e.message },
      { status: 200 }
    );
  }
}
