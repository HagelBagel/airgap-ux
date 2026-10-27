/**
 * Plain-text transcript parser.
 * Turns "Name: text" lines into SpeakerSegments. Pure and framework-free.
 */

import type { SpeakerSegment } from '../types';

/** Speaker used for text that appears before the first "Name:" line. */
export const UNKNOWN_SPEAKER = 'Unknown';

// A short name starting with a letter or digit, followed by a colon.
const SPEAKER_LINE = /^([\p{L}\p{N}][\p{L}\p{N}_ .'-]{0,39}):(.*)$/u;

/**
 * Parse a plain-text transcript into speaker segments.
 * A "Name: text" line starts a new segment; other non-empty lines continue the
 * previous one. Blank lines are ignored. Segments have no timestamps.
 */
export function parsePlainTextTranscript(transcript: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  let current: SpeakerSegment | null = null;

  for (const rawLine of transcript.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = SPEAKER_LINE.exec(line);
    if (match) {
      current = { speakerId: match[1]!.trim(), text: match[2]!.trim() };
      segments.push(current);
    } else if (current) {
      current.text = current.text ? `${current.text} ${line}` : line;
    } else {
      current = { speakerId: UNKNOWN_SPEAKER, text: line };
      segments.push(current);
    }
  }

  return segments.filter(segment => segment.text.length > 0);
}
