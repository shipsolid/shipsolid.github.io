// Parses a pasted Spotify track/playlist/album URL (or a bare spotify: URI) into the strict
// `spotify:type:id` form the iFrame API's createController expects. Only alphanumeric IDs match,
// so this also acts as the input's validation gate before it ever reaches the embed.
export function parseSpotifyUri(input: string | null | undefined): string | null {
  const trimmed = (input ?? '').trim();
  let match = trimmed.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (!match) match = trimmed.match(/^spotify:(track|playlist|album):([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `spotify:${match[1]}:${match[2]}`;
}
