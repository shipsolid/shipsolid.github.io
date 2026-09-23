import { describe, expect, it } from 'vitest';
import { parseSpotifyUri } from './spotify';

describe('parseSpotifyUri', () => {
  it('parses a playlist URL', () => {
    expect(parseSpotifyUri('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn')).toBe(
      'spotify:playlist:37i9dQZF1DWWQRwui0ExPn'
    );
  });

  it('parses a track URL', () => {
    expect(parseSpotifyUri('https://open.spotify.com/track/abc123XYZ')).toBe('spotify:track:abc123XYZ');
  });

  it('parses an album URL with query params still attached', () => {
    expect(parseSpotifyUri('https://open.spotify.com/album/abc123XYZ?si=xyz')).toBe('spotify:album:abc123XYZ');
  });

  it('parses a bare spotify: URI', () => {
    expect(parseSpotifyUri('spotify:track:abc123XYZ')).toBe('spotify:track:abc123XYZ');
  });

  it('trims surrounding whitespace', () => {
    expect(parseSpotifyUri('  spotify:track:abc123XYZ  ')).toBe('spotify:track:abc123XYZ');
  });

  it('returns null for unrecognized input', () => {
    expect(parseSpotifyUri('https://example.com/not-spotify')).toBeNull();
  });

  it('returns null for empty or missing input', () => {
    expect(parseSpotifyUri('')).toBeNull();
    expect(parseSpotifyUri(null)).toBeNull();
    expect(parseSpotifyUri(undefined)).toBeNull();
  });
});
