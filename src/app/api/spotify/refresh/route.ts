import { NextRequest, NextResponse } from "next/server";
import { getClientId, tokensFromResponse } from "@/lib/spotify";
import type { SpotifyTokens } from "@/lib/types";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get("sp_tokens")?.value;
  if (!raw) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let tokens: SpotifyTokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_cookie" }, { status: 401 });
  }

  if (!tokens.refresh_token) {
    return NextResponse.json({ error: "no_refresh" }, { status: 401 });
  }

  if (Date.now() < tokens.expires_at - 60_000) {
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_at: tokens.expires_at,
    });
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: getClientId(),
  });

  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (secret) {
    headers.Authorization =
      "Basic " + Buffer.from(`${getClientId()}:${secret}`).toString("base64");
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body,
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  const data = await tokenRes.json();
  const next = tokensFromResponse({
    ...data,
    refresh_token: data.refresh_token || tokens.refresh_token,
  });

  const res = NextResponse.json({
    access_token: next.access_token,
    expires_at: next.expires_at,
  });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("sp_tokens", JSON.stringify(next), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
