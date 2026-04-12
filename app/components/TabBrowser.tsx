"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getFavoriteArtists,
  getFavoriteTabsForArtist,
  type FavoriteArtist,
  type FavoriteTab,
} from "../lib/favorites";
import type { TabSourceInfo } from "./TabPlayer";

interface TabBrowserProps {
  onTabLoaded: (data: ArrayBuffer, fileName: string, sourceInfo: TabSourceInfo) => void;
  favVersion: number; // bumped externally to force re-read of favorites
}

interface Artist {
  name: string;
  slug: string;
  image: string | null;
}

interface Song {
  name: string;
  slug: string;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0".split("");

// Heart icon used in multiple places
function HeartIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function TabBrowser({ onTabLoaded, favVersion }: TabBrowserProps) {
  const [step, setStep] = useState<"letters" | "artists" | "songs">("letters");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Read favorites from localStorage (re-read when favVersion changes)
  const [favArtists, setFavArtists] = useState<FavoriteArtist[]>([]);
  const [favTabsForArtist, setFavTabsForArtist] = useState<FavoriteTab[]>([]);

  useEffect(() => {
    setFavArtists(getFavoriteArtists());
  }, [favVersion]);

  useEffect(() => {
    if (selectedArtist) {
      setFavTabsForArtist(getFavoriteTabsForArtist(selectedArtist.slug));
    } else {
      setFavTabsForArtist([]);
    }
  }, [selectedArtist, favVersion]);

  const loadArtists = useCallback(async (letter: string) => {
    setLoading(true);
    setError(null);
    setSelectedLetter(letter);
    setStep("artists");
    setSearchFilter("");

    try {
      const res = await fetch(`/api/tabs/artists?letter=${letter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArtists(data.artists);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSongs = useCallback(async (artist: Artist) => {
    setLoading(true);
    setError(null);
    setSelectedArtist(artist);
    setStep("songs");
    setSearchFilter("");

    try {
      const res = await fetch(`/api/tabs/songs?artist=${artist.slug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSongs(data.songs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSongsFromFav = useCallback((fav: FavoriteArtist) => {
    loadSongs({ name: fav.name, slug: fav.slug, image: fav.image });
  }, [loadSongs]);

  const downloadAndPlay = useCallback(
    async (song: Song) => {
      if (!selectedArtist) return;
      setDownloading(song.slug);
      setError(null);

      try {
        const res = await fetch(
          `/api/tabs/download?artist=${selectedArtist.slug}&song=${song.slug}`,
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Error ${res.status}`);
        }

        const buffer = await res.arrayBuffer();

        const disposition = res.headers.get("content-disposition");
        let fileName = `${selectedArtist.slug}-${song.slug}.gp`;
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/);
          if (match?.[1]) fileName = match[1];
        }

        onTabLoaded(buffer, fileName, {
          artistSlug: selectedArtist.slug,
          artistName: selectedArtist.name,
          songSlug: song.slug,
          songName: song.name,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setDownloading(null);
      }
    },
    [selectedArtist, onTabLoaded],
  );

  const goBack = () => {
    setError(null);
    setSearchFilter("");
    if (step === "songs") {
      setStep("artists");
      setSelectedArtist(null);
    } else if (step === "artists") {
      setStep("letters");
      setSelectedLetter("");
    }
  };

  const filteredArtists = searchFilter
    ? artists.filter((a) =>
        a.name.toLowerCase().includes(searchFilter.toLowerCase()),
      )
    : artists;

  const filteredSongs = searchFilter
    ? songs.filter((s) =>
        s.name.toLowerCase().includes(searchFilter.toLowerCase()),
      )
    : songs;

  // Split songs into favorites-first and rest
  const favSongSlugs = new Set(favTabsForArtist.map((f) => f.songSlug));
  const favSongs = filteredSongs.filter((s) => favSongSlugs.has(s.slug));
  const otherSongs = filteredSongs.filter((s) => !favSongSlugs.has(s.slug));

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb / nav */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 text-sm">
        <button
          onClick={() => { setStep("letters"); setSelectedLetter(""); setSelectedArtist(null); setSearchFilter(""); }}
          className={`transition-colors ${step === "letters" ? "text-amber-400" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Explorar
        </button>

        {selectedLetter && (
          <>
            <span className="text-zinc-600">/</span>
            <button
              onClick={() => { setStep("artists"); setSelectedArtist(null); setSearchFilter(""); }}
              className={`uppercase transition-colors ${step === "artists" ? "text-amber-400" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {selectedLetter}
            </button>
          </>
        )}

        {selectedArtist && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-amber-400">{selectedArtist.name}</span>
          </>
        )}

        {step !== "letters" && (
          <button
            onClick={goBack}
            className="ml-auto text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            Volver
          </button>
        )}
      </div>

      {/* Search bar (when in artists or songs) */}
      {(step === "artists" || step === "songs") && !loading && (
        <div className="px-4 py-2 border-b border-zinc-800/50">
          <input
            type="text"
            placeholder={step === "artists" ? "Filtrar artistas..." : "Filtrar canciones..."}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm">Buscando...</span>
            </div>
          </div>
        )}

        {/* ── Letters view ── */}
        {step === "letters" && !loading && (
          <div>
            <p className="text-zinc-500 text-sm mb-4">Selecciona una letra para explorar artistas</p>
            <div className="grid grid-cols-9 gap-2">
              {ALPHABET.map((l) => (
                <button
                  key={l}
                  onClick={() => loadArtists(l)}
                  className="h-12 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 font-semibold uppercase hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                >
                  {l === "0" ? "#" : l}
                </button>
              ))}
            </div>

            {/* ── Favorites section ── */}
            {favArtists.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-pink-400"><HeartIcon filled size={16} /></span>
                  <h3 className="text-sm font-medium text-zinc-300">Favoritos</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {favArtists.map((fav) => (
                    <button
                      key={fav.slug}
                      onClick={() => loadSongsFromFav(fav)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20 hover:bg-pink-500/10 hover:border-pink-500/30 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">
                        {fav.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-zinc-200 group-hover:text-pink-400 transition-colors truncate text-sm">
                          {fav.name}
                        </span>
                        {/* Show count of favorite tabs for this artist */}
                        {(() => {
                          const count = getFavoriteTabsForArtist(fav.slug).length;
                          return count > 0 ? (
                            <span className="text-[11px] text-zinc-600">
                              {count} tab{count > 1 ? "s" : ""} favorita{count > 1 ? "s" : ""}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Artist list ── */}
        {step === "artists" && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredArtists.length === 0 && (
              <p className="text-zinc-600 text-sm col-span-full">No se encontraron artistas</p>
            )}
            {filteredArtists.map((artist) => (
              <button
                key={artist.slug}
                onClick={() => loadSongs(artist)}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
              >
                {artist.image && !artist.image.includes("no-image") ? (
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-10 h-10 rounded-full object-cover bg-zinc-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-500 text-sm font-bold">
                    {artist.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-zinc-300 group-hover:text-amber-400 transition-colors truncate">
                  {artist.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Song list ── */}
        {step === "songs" && !loading && (
          <div className="flex flex-col gap-1">
            {filteredSongs.length === 0 && (
              <p className="text-zinc-600 text-sm">No se encontraron canciones</p>
            )}

            {/* Favorite tabs first */}
            {favSongs.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1 mt-1">
                  <span className="text-pink-400"><HeartIcon filled size={12} /></span>
                  <span className="text-xs text-pink-400/80 font-medium">Favoritas</span>
                </div>
                {favSongs.map((song) => (
                  <SongRow
                    key={song.slug}
                    song={song}
                    isFav
                    downloading={downloading}
                    onPlay={() => downloadAndPlay(song)}
                  />
                ))}

                {otherSongs.length > 0 && (
                  <div className="border-t border-zinc-800 my-2" />
                )}
              </>
            )}

            {/* Rest of songs */}
            {otherSongs.map((song) => (
              <SongRow
                key={song.slug}
                song={song}
                isFav={false}
                downloading={downloading}
                onPlay={() => downloadAndPlay(song)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SongRow({
  song,
  isFav,
  downloading,
  onPlay,
}: {
  song: Song;
  isFav: boolean;
  downloading: string | null;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      disabled={downloading !== null}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left group disabled:opacity-50 ${
        isFav
          ? "bg-pink-500/5 border-pink-500/20 hover:bg-pink-500/10 hover:border-pink-500/30"
          : "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        {isFav ? (
          <span className="text-pink-400 shrink-0"><HeartIcon filled size={14} /></span>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
        <span className={`transition-colors ${
          isFav
            ? "text-zinc-200 group-hover:text-pink-400"
            : "text-zinc-300 group-hover:text-amber-400"
        }`}>
          {song.name}
        </span>
      </div>

      {downloading === song.slug ? (
        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-700 group-hover:text-amber-400 transition-colors shrink-0"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
    </button>
  );
}
