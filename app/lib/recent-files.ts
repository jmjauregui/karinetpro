const STORAGE_KEY = "karinetpro_recent_files";
const MAX_RECENT = 20;

export interface RecentFile {
  fileName: string;
  artistSlug?: string;
  artistName?: string;
  songSlug?: string;
  songName?: string;
  openedAt: number; // timestamp
}

export function getRecentFiles(): RecentFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentFile(entry: Omit<RecentFile, "openedAt">): void {
  const list = getRecentFiles();
  // Remove existing entry for same file
  const filtered = list.filter(
    (r) =>
      !(r.fileName === entry.fileName && r.songSlug === entry.songSlug && r.artistSlug === entry.artistSlug)
  );
  filtered.unshift({ ...entry, openedAt: Date.now() });
  if (filtered.length > MAX_RECENT) filtered.length = MAX_RECENT;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
