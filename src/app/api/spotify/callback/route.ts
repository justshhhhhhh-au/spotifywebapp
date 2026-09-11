import { NextRequest, NextResponse } from "next/server";
import { getClientId, getRedirectUri, tokensFromResponse } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (error) {
    return NextResponse.redirect(`${appUrl}/?spotify_error=${encodeURIComponent(error)}`);
  }

  const savedState = req.cookies.get("sp_oauth_state")?.value;
  const verifier = req.cookies.get("sp_pkce_verifier")?.value;

  if (!code || !verifier || !state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/?spotify_error=invalid_state`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: getClientId(),
    code_verifier: verifier,
  });

  // Optional confidential client
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
    const text = await tokenRes.text();
    return NextResponse.redirect(
      `${appUrl}/?spotify_error=${encodeURIComponent(text.slice(0, 120))}`
    );
  }

  const data = await tokenRes.json();
  const tokens = tokensFromResponse(data);

  const res = NextResponse.redirect(`${appUrl}/?spotify=connected`);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("sp_tokens", JSON.stringify(tokens), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete("sp_pkce_verifier");
  res.cookies.delete("sp_oauth_state");
  return res;
}
