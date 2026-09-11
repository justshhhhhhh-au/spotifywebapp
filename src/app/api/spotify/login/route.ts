import { NextResponse } from "next/server";
import { createPkcePair, randomString } from "@/lib/pkce";
import { getClientId, getRedirectUri, hasSpotifyConfig, SPOTIFY_SCOPES } from "@/lib/spotify";

export async function GET() {
  if (!hasSpotifyConfig()) {
    return NextResponse.json(
      {
        error: "missing_client_id",
        message:
          "Set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in .env.local from https://developer.spotify.com/dashboard",
      },
      { status: 400 }
    );
  }

  const { verifier, challenge } = await createPkcePair();
  const state = randomString(24);

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  const res = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );

  // httpOnly cookies hold PKCE verifier + state for the callback
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("sp_pkce_verifier", verifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  res.cookies.set("sp_oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}
