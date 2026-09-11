export type TrackSource = "local" | "spotify" | "demo" | "youtube" | "apple" | "soundcloud";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover: string;
  source: TrackSource;
  url?: string;
  uri?: string; // spotify:track:...
  bpm?: number;
  key?: string;
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope?: string;
}

export interface ConnectedSources {
  local: boolean;
  spotify: boolean;
  youtube: boolean;
  apple: boolean;
  soundcloud: boolean;
}
