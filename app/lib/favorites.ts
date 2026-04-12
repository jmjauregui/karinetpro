/**
 * Favorites system backed by localStorage.
 *
 * Two collections:
 *  - Favorite artists: { slug, name, image }
 *  - Favorite tabs:    { artistSlug, artistName, songSlug, songName }
 */

export interface FavoriteArtist {
  slug: string;
  name: string;
  image: string | null;
}

export interface FavoriteTab {
  artistSlug: string;
  artistName: string;
  songSlug: string;
  songName: string;
}

const ARTISTS_KEY = "karinetpro_fav_artists";
const TABS_KEY = "karinetpro_fav_tabs";

// ── Artists ──────────────────────────────────────────────

export function getFavoriteArtists(): FavoriteArtist[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ARTISTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isArtistFavorite(slug: string): boolean {
  return getFavoriteArtists().some((a) => a.slug === slug);
}

export function toggleFavoriteArtist(artist: FavoriteArtist): boolean {
  const list = getFavoriteArtists();
  const idx = list.findIndex((a) => a.slug === artist.slug);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(ARTISTS_KEY, JSON.stringify(list));
    return false; // removed
  } else {
    list.push(artist);
    localStorage.setItem(ARTISTS_KEY, JSON.stringify(list));
    return true; // added
  }
}

// ── Tabs ─────────────────────────────────────────────────

export function getFavoriteTabs(): FavoriteTab[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TABS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isTabFavorite(artistSlug: string, songSlug: string): boolean {
  return getFavoriteTabs().some(
    (t) => t.artistSlug === artistSlug && t.songSlug === songSlug,
  );
}

export function toggleFavoriteTab(tab: FavoriteTab): boolean {
  const list = getFavoriteTabs();
  const idx = list.findIndex(
    (t) => t.artistSlug === tab.artistSlug && t.songSlug === tab.songSlug,
  );
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(TABS_KEY, JSON.stringify(list));
    return false;
  } else {
    list.push(tab);
    localStorage.setItem(TABS_KEY, JSON.stringify(list));
    // Also ensure the artist is in favorites
    if (!isArtistFavorite(tab.artistSlug)) {
      toggleFavoriteArtist({
        slug: tab.artistSlug,
        name: tab.artistName,
        image: null,
      });
    }
    return true;
  }
}

export function getFavoriteTabsForArtist(artistSlug: string): FavoriteTab[] {
  return getFavoriteTabs().filter((t) => t.artistSlug === artistSlug);
}
