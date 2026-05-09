import type { SpeakerSegment } from '../../domain/types';

/**
 * SpeakerBatch
 *
 * Represents a logical group of consecutive segments from the same speaker.
 * Used to batch segment extraction for LLM processing.
 */
export interface SpeakerBatch {
  speakerId: string;
  // Metadata-prefixed block sent directly to the LLM.
  text: string;
  segments: SpeakerSegment[];
}

/**
 * batchSegmentsBySpeaker
 *
 * Groups consecutive segments by the same speakerId into SpeakerBatch objects.
 * Each batch text is formatted as:
 *   SPEAKER_ID: [ID] | TEXT: [Full combined text of the turn]
 *
 * Algorithm:
 * 1. Iterate through segments
 * 2. Group consecutive segments with the same speakerId
 * 3. Build one combined text block for each speaker turn
 * 4. Prefix the block with speaker metadata for strict attribution
 * 5. Return array of SpeakerBatch objects
 *
 * @param segments - Array of speaker segments from transcript
 * @returns Array of SpeakerBatch objects
 */
export function batchSegmentsBySpeaker(
  segments: SpeakerSegment[],
): SpeakerBatch[] {
  if (segments.length === 0) return [];

  const batches: SpeakerBatch[] = [];
  let currentSpeaker = segments[0]!.speakerId;
  let currentSegments: SpeakerSegment[] = [];

  for (const segment of segments) {
    if (segment.speakerId !== currentSpeaker) {
      if (currentSegments.length > 0) {
        batches.push(createSpeakerTurnBatch(currentSpeaker, currentSegments));
      }

      currentSpeaker = segment.speakerId;
      currentSegments = [segment];
      continue;
    }

    currentSegments.push(segment);
  }

  if (currentSegments.length > 0) {
    batches.push(createSpeakerTurnBatch(currentSpeaker, currentSegments));
  }

  return batches;
}

function createSpeakerTurnBatch(
  speakerId: string,
  segments: SpeakerSegment[],
): SpeakerBatch {
  const combinedText = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(' ');

  return {
    speakerId,
    text: `SPEAKER_ID: ${speakerId} | TEXT: ${combinedText}`,
    segments,
  };
}
