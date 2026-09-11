"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_TRACKS } from "@/lib/demo-tracks";
import type { ConnectedSources, Track } from "@/lib/types";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type Props = {
  mode?: "full" | "embed";
  className?: string;
};

export default function MediaPlayer({ mode = "full", className = "" }: Props) {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<false | "all" | "one">(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [view, setView] = useState<"home" | "search" | "library">("home");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState<ConnectedSources>({
    local: true,
    spotify: false,
    youtube: false,
    apple: false,
    soundcloud: false,
  });
  const [spotifyUser, setSpotifyUser] = useState<{ name?: string; image?: string } | null>(null);
  const [modal, setModal] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const current = index >= 0 ? queue[index] : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  // Spotify session
  useEffect(() => {
    fetch("/api/spotify/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setConnected((c) => ({ ...c, spotify: true }));
          setSpotifyUser(d.user);
          if (d.recentSaved?.length) {
            setTracks((prev) => {
              const ids = new Set(prev.map((t) => t.id));
              const add = d.recentSaved.filter((t: Track) => !ids.has(t.id));
              return [...add, ...prev];
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // URL flash after OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("spotify") === "connected") {
      showToast("Spotify connected");
      u.searchParams.delete("spotify");
      window.history.replaceState({}, "", u.pathname);
    }
    const err = u.searchParams.get("spotify_error");
    if (err) {
      showToast(`Spotify: ${err}`);
      u.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", u.pathname);
    }
  }, []);

  const clearDemo = () => {
    if (demoTimer.current) clearInterval(demoTimer.current);
    demoTimer.current = null;
  };

  const loadAndPlay = useCallback((track: Track, q: Track[], i: number) => {
    setQueue(q);
    setIndex(i);
    clearDemo();
    const audio = audioRef.current;
    if (track.url && audio) {
      audio.src = track.url;
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => {
          showToast("Playback blocked — click play again");
          setPlaying(false);
        });
      setDuration(track.duration || 0);
    } else {
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      setPlaying(true);
      setDuration(track.duration || 180);
      setProgress(0);
      let cur = 0;
      const total = track.duration || 180;
      demoTimer.current = setInterval(() => {
        cur += 0.25;
        if (cur >= total) {
          clearDemo();
          // auto next handled by effect watching progress
          setProgress(total);
          setPlaying(false);
          return;
        }
        setProgress(cur);
      }, 250);
      if (track.source === "demo") {
        showToast(`Demo UI — drop local files or connect Spotify for real audio`);
      }
      if (track.source === "spotify" && track.uri) {
        showToast("Spotify Premium + Web Playback SDK needed for in-browser stream");
      }
    }
  }, []);

  const playById = (id: string, list: Track[]) => {
    const i = list.findIndex((t) => t.id === id);
    if (i < 0) return;
    loadAndPlay(list[i], list, i);
  };

  const next = useCallback(() => {
    if (!queue.length) return;
    let ni = shuffle
      ? Math.floor(Math.random() * queue.length)
      : (index + 1) % queue.length;
    loadAndPlay(queue[ni], queue, ni);
  }, [queue, index, shuffle, loadAndPlay]);

  const prev = () => {
    if (!queue.length) return;
    if (progress > 3) {
      if (audioRef.current?.src) audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }
    const ni = (index - 1 + queue.length) % queue.length;
    loadAndPlay(queue[ni], queue, ni);
  };

  const togglePlay = () => {
    if (!current) {
      if (tracks[0]) playById(tracks[0].id, tracks);
      return;
    }
    if (current.url && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    } else {
      if (playing) {
        clearDemo();
        setPlaying(false);
      } else {
        loadAndPlay(current, queue, index);
      }
    }
  };

  // when demo ends, next
  useEffect(() => {
    if (!playing && progress > 0 && duration > 0 && progress >= duration - 0.3) {
      if (repeat === "one" && current) {
        loadAndPlay(current, queue, index);
      } else next();
    }
  }, [playing, progress, duration]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress(a.currentTime);
    setDuration(a.duration);
  };

  const seek = (pct: number) => {
    const a = audioRef.current;
    if (a?.src && a.duration) {
      a.currentTime = pct * a.duration;
      setProgress(a.currentTime);
    } else if (current) {
      setProgress(pct * (duration || current.duration));
    }
  };

  const addLocalFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
    );
    const added: Track[] = [];
    for (const file of arr) {
      const url = URL.createObjectURL(file);
      let dur = 0;
      try {
        dur = await new Promise<number>((resolve, reject) => {
          const el = new Audio();
          el.preload = "metadata";
          el.onloadedmetadata = () => resolve(el.duration);
          el.onerror = reject;
          el.src = url;
        });
      } catch {}
      added.push({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Local File",
        album: "Local Library",
        duration: dur,
        cover: "/album-art.jpg",
        source: "local",
        url,
      });
    }
    setLocalTracks((t) => [...added, ...t]);
    setTracks((t) => [...t, ...added]);
    showToast(`Added ${added.length} local track${added.length === 1 ? "" : "s"}`);
    setView("library");
  };

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const drop = (e: DragEvent) => {
      prevent(e);
      if (e.dataTransfer?.files?.length) addLocalFiles(e.dataTransfer.files);
    };
    document.body.addEventListener("dragover", prevent);
    document.body.addEventListener("drop", drop);
    return () => {
      document.body.removeEventListener("dragover", prevent);
      document.body.removeEventListener("drop", drop);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const all = [...tracks, ...localTracks];
    const uniq = Array.from(new Map(all.map((t) => [t.id, t])).values());
    return uniq.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album || "").toLowerCase().includes(q)
    );
  }, [search, tracks, localTracks]);

  const connectSource = (src: string) => {
    if (src === "local") return;
    if (src === "spotify") {
      if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID === "your_spotify_client_id") {
        setModal("spotify-setup");
        return;
      }
      window.location.href = "/api/spotify/login";
      return;
    }
    setModal(src);
  };

  const simulateConnect = (src: string) => {
    setConnected((c) => ({ ...c, [src]: true } as ConnectedSources));
    setModal(null);
    showToast(`${src} connected (demo stub)`);
  };

  const pct = duration ? (progress / duration) * 100 : 0;
  const isEmbed = mode === "embed";

  return (
    <div
      className={`flex flex-col bg-sparx-bg text-white font-sans ${
        isEmbed ? "h-full min-h-[420px]" : "h-[100dvh]"
      } ${className}`}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => {
          if (repeat === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          } else next();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {!isEmbed && (
          <aside
            className={`w-[260px] bg-black border-r border-white/10 p-5 flex flex-col gap-6 shrink-0 z-20 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:bottom-[90px] max-md:transition-transform ${
              sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
            }`}
          >
            <div className="flex items-center gap-2 px-2 font-bold text-lg tracking-tight">
              <span className="text-sparx-green text-xl">◈</span> Sparx Media
            </div>
            <nav className="flex flex-col gap-1">
              {(
                [
                  ["home", "Home"],
                  ["search", "Search"],
                  ["library", "Your Library"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setView(k);
                    setSidebarOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                    view === k
                      ? "bg-sparx-hover text-white"
                      : "text-sparx-muted hover:text-white hover:bg-sparx-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-sparx-dim px-2 mb-2">
                Sources
              </h3>
              {(
                [
                  ["local", "Local Files", connected.local],
                  ["spotify", "Spotify", connected.spotify],
                  ["youtube", "YouTube Music", connected.youtube],
                  ["apple", "Apple Music", connected.apple],
                  ["soundcloud", "SoundCloud", connected.soundcloud],
                ] as const
              ).map(([key, label, on]) => (
                <button
                  key={key}
                  onClick={() => connectSource(key)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-sparx-muted hover:bg-sparx-hover hover:text-white"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      on ? "bg-sparx-green" : "bg-sparx-dim"
                    }`}
                  />
                  {label}
                  <span
                    className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      on
                        ? "bg-sparx-green/15 text-sparx-green"
                        : "bg-sparx-hover text-sparx-muted"
                    }`}
                  >
                    {on ? "ON" : "Connect"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full bg-sparx-green text-black font-bold text-sm py-2.5 rounded-full hover:scale-[1.02] transition"
              >
                + Add Local Music
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
                multiple
                hidden
                onChange={(e) => e.target.files && addLocalFiles(e.target.files)}
              />
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#1a1a2e] via-sparx-bg to-sparx-bg">
          {!isEmbed && (
            <header className="flex items-center gap-3 px-4 md:px-6 py-3 sticky top-0 z-10 bg-black/50 backdrop-blur-md">
              <button
                className="md:hidden text-xl px-2"
                onClick={() => setSidebarOpen((s) => !s)}
              >
                ☰
              </button>
              <div className="flex-1 max-w-md flex items-center gap-2 bg-[#242424] rounded-full px-4 py-2 text-sparx-muted">
                <span>🔍</span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (e.target.value) setView("search");
                  }}
                  placeholder="Search songs, artists, local files…"
                  className="bg-transparent outline-none text-sm text-white w-full"
                />
              </div>
              <div className="flex items-center gap-2 bg-black rounded-full pl-1 pr-3 py-1 text-sm font-semibold">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-sparx-green grid place-items-center text-xs">
                  {spotifyUser?.name?.[0] || "J"}
                </span>
                <span className="hidden sm:inline">
                  {spotifyUser?.name || "Justin Shu"}
                </span>
              </div>
            </header>
          )}

          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8">
            {(view === "home" || isEmbed) && (
              <>
                <div className={`flex gap-6 items-end py-6 ${isEmbed ? "flex-col items-start" : "max-md:flex-col max-md:items-start"}`}>
                  <img
                    src="/album-art.jpg"
                    alt="sneaky!!"
                    className={`${isEmbed ? "w-28 h-28" : "w-40 h-40 md:w-52 md:h-52"} rounded-lg shadow-2xl object-cover shrink-0`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-sparx-muted mb-1">
                      Playlist
                    </p>
                    <h1 className={`font-extrabold tracking-tight leading-none mb-2 ${isEmbed ? "text-2xl" : "text-3xl md:text-5xl"}`}>
                      sneaky!!
                    </h1>
                    <p className="text-sm text-sparx-muted mb-4">
                      Mixed by Justin Shu · {tracks.length} songs
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => tracks[0] && playById(tracks[0].id, tracks)}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-sparx-green text-black grid place-items-center shadow-lg shadow-sparx-green/30 hover:scale-105 transition"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => {
                          setShuffle(true);
                          if (tracks.length) {
                            const i = Math.floor(Math.random() * tracks.length);
                            playById(tracks[i].id, tracks);
                          }
                        }}
                        className="px-4 py-2 rounded-full border border-white/20 text-sm font-semibold hover:border-white"
                      >
                        Shuffle
                      </button>
                    </div>
                  </div>
                </div>
                <TrackRows
                  tracks={tracks}
                  currentId={current?.id}
                  playing={playing}
                  onPlay={(id) => playById(id, tracks)}
                  compact={isEmbed}
                />
              </>
            )}

            {view === "search" && !isEmbed && (
              <div className="pt-4">
                <h2 className="text-2xl font-bold mb-2">Search</h2>
                <p className="text-sparx-muted text-sm mb-4">
                  Across local library and connected sources
                </p>
                <TrackRows
                  tracks={searchHits}
                  currentId={current?.id}
                  playing={playing}
                  onPlay={(id) => playById(id, searchHits)}
                />
              </div>
            )}

            {view === "library" && !isEmbed && (
              <div className="pt-4">
                <h2 className="text-2xl font-bold mb-4">Your Library</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-3 bg-sparx-card p-3 rounded-lg">
                    <img src="/album-art.jpg" className="w-14 h-14 rounded object-cover" alt="" />
                    <div>
                      <div className="font-semibold">sneaky!!</div>
                      <div className="text-xs text-sparx-muted">Playlist · Justin Shu</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-sparx-card p-3 rounded-lg">
                    <div className="w-14 h-14 rounded bg-sparx-hover grid place-items-center text-2xl">
                      📁
                    </div>
                    <div>
                      <div className="font-semibold">Local Music</div>
                      <div className="text-xs text-sparx-muted">
                        {localTracks.length} file{localTracks.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2">Recently added local</h3>
                <TrackRows
                  tracks={localTracks}
                  currentId={current?.id}
                  playing={playing}
                  onPlay={(id) => playById(id, localTracks)}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Player bar */}
      <footer className="h-[90px] shrink-0 border-t border-white/10 bg-[#181818] grid grid-cols-[1fr_1.4fr_1fr] max-md:grid-cols-[1fr_auto] max-md:grid-rows-[auto_auto] items-center px-3 md:px-4 gap-2 md:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={current?.cover || "/album-art.jpg"}
            alt=""
            className="w-14 h-14 rounded object-cover shadow"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {current?.title || "Justin Shu’s Jam"}
            </div>
            <div className="text-xs text-sparx-muted truncate">
              {current?.artist || "Select a track"}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 max-md:col-span-2 max-md:order-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShuffle((s) => !s)}
              className={`text-sm ${shuffle ? "text-sparx-green" : "text-sparx-muted"}`}
            >
              ⇄
            </button>
            <button onClick={prev} className="text-sparx-muted hover:text-white">
              ⏮
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-black grid place-items-center hover:scale-105"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button onClick={next} className="text-sparx-muted hover:text-white">
              ⏭
            </button>
            <button
              onClick={() =>
                setRepeat((r) => (r === false ? "all" : r === "all" ? "one" : false))
              }
              className={`text-sm ${repeat ? "text-sparx-green" : "text-sparx-muted"}`}
            >
              {repeat === "one" ? "①" : "↻"}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-[11px] text-sparx-muted w-9 tabular-nums">
              {fmt(progress)}
            </span>
            <div
              className="flex-1 h-1 bg-[#4d4d4d] rounded cursor-pointer group"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - r.left) / r.width);
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-sparx-green rounded"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-sparx-muted w-9 tabular-nums text-right">
              {fmt(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 max-md:col-start-2 max-md:row-start-1">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sparx-muted">🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-sparx-green"
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-sparx-green/15 text-sparx-green">
            {current?.source || "Local"}
          </span>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-sparx-green text-black font-semibold text-sm px-5 py-2.5 rounded-lg z-50 shadow-lg">
          {toast}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] grid place-items-center p-4">
          <div className="bg-sparx-elevated border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2 capitalize">
              {modal === "spotify-setup" ? "Spotify setup" : `Connect ${modal}`}
            </h2>
            {modal === "spotify-setup" ? (
              <div className="text-sm text-sparx-muted space-y-2 mb-5">
                <p>
                  1. Create an app at{" "}
                  <a
                    className="text-sparx-green underline"
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                  >
                    developer.spotify.com/dashboard
                  </a>
                </p>
                <p>
                  2. Add redirect URI:{" "}
                  <code className="text-xs bg-black px-1 rounded">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/spotify/callback`
                      : "/api/spotify/callback"}
                  </code>
                </p>
                <p>
                  3. Put Client ID in{" "}
                  <code className="text-xs bg-black px-1 rounded">.env.local</code> as{" "}
                  <code className="text-xs">NEXT_PUBLIC_SPOTIFY_CLIENT_ID</code>
                </p>
                <p>4. Restart <code className="text-xs">npm run dev</code> and click Connect again.</p>
              </div>
            ) : (
              <p className="text-sm text-sparx-muted mb-5">
                Production OAuth for <strong>{modal}</strong> is stubbed. Local files work fully.
                Spotify uses real PKCE when Client ID is configured.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-full border border-white/20 text-sm font-semibold"
              >
                Close
              </button>
              {modal !== "spotify-setup" && (
                <button
                  onClick={() => simulateConnect(modal)}
                  className="px-4 py-2 rounded-full bg-sparx-green text-black text-sm font-bold"
                >
                  Simulate connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRows({
  tracks,
  currentId,
  playing,
  onPlay,
  compact,
}: {
  tracks: Track[];
  currentId?: string;
  playing: boolean;
  onPlay: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="mt-2">
      {tracks.map((t, i) => {
        const active = currentId === t.id && playing;
        return (
          <button
            key={t.id}
            onClick={() => onPlay(t.id)}
            className={`w-full grid items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition hover:bg-sparx-hover ${
              active ? "bg-sparx-green/10 text-sparx-green" : "text-sparx-muted"
            } ${compact ? "grid-cols-[32px_1fr_48px]" : "grid-cols-[32px_1fr_1fr_64px] max-md:grid-cols-[32px_1fr_48px]"}`}
          >
            <span className="text-center tabular-nums text-xs">{i + 1}</span>
            <div className="flex items-center gap-3 min-w-0">
              <img src={t.cover} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              <div className="min-w-0">
                <div className={`font-medium truncate ${active ? "text-sparx-green" : "text-white"}`}>
                  {t.title}
                </div>
                <div className="text-xs truncate">{t.artist}</div>
              </div>
            </div>
            {!compact && (
              <div className="truncate text-sm max-md:hidden">{t.album || t.source}</div>
            )}
            <div className="text-right tabular-nums text-xs">{fmt(t.duration)}</div>
          </button>
        );
      })}
      {!tracks.length && (
        <p className="text-sparx-muted text-sm px-3 py-6">No tracks yet — add local files or connect Spotify.</p>
      )}
    </div>
  );
}
