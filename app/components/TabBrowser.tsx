"use client";

import { useState, useCallback } from "react";

interface TabBrowserProps {
  onTabLoaded: (data: ArrayBuffer, fileName: string) => void;
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

export default function TabBrowser({ onTabLoaded }: TabBrowserProps) {
  const [step, setStep] = useState<"letters" | "artists" | "songs">("letters");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

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

        // Extract filename from content-disposition or build one
        const disposition = res.headers.get("content-disposition");
        let fileName = `${selectedArtist.slug}-${song.slug}.gp`;
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/);
          if (match?.[1]) fileName = match[1];
        }

        onTabLoaded(buffer, fileName);
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

        {/* Letter grid */}
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
          </div>
        )}

        {/* Artist list */}
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

        {/* Song list */}
        {step === "songs" && !loading && (
          <div className="flex flex-col gap-1">
            {filteredSongs.length === 0 && (
              <p className="text-zinc-600 text-sm">No se encontraron canciones</p>
            )}
            {filteredSongs.map((song) => (
              <button
                key={song.slug}
                onClick={() => downloadAndPlay(song)}
                disabled={downloading !== null}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
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
                  <span className="text-zinc-300 group-hover:text-amber-400 transition-colors">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
