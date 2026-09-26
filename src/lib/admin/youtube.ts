const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

/**
 * Accepts a bare video ID or any common YouTube URL shape (watch, youtu.be,
 * shorts, embed, live) and returns the 11-character video ID, or null when
 * it can't be recognised. Never trusts the input as-is — the extracted ID is
 * always re-validated by `videoSchema` before it's stored.
 */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      return v && YOUTUBE_ID_PATTERN.test(v) ? v : null;
    }
    const match = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
    if (match) return match[2];
  }
  return null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
