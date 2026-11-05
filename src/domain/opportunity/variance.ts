/**
 * Multi-speaker tension / conflict detection.
 *
 * When two or more speakers rate the same Desired Outcome differently, their
 * divergence in Satisfaction is a research signal — it may indicate:
 *   • Different user segments with genuinely different needs
 *   • A power-user vs. novice divide
 *   • Context-dependent satisfaction (team size, workflow, etc.)
 *
 * The Tension Map (amber ⚠️ badge) fires when the spread exceeds the threshold.
 */

import type { SpeakerOutcome } from '../types';

/** Points of satisfaction spread that trigger the Tension Map badge. */
export const TENSION_THRESHOLD = 3;

/**
 * Returns true when the satisfaction scores across all speaker outcomes
 * differ by more than TENSION_THRESHOLD points (max − min > 3).
 */
export function hasTension(speakerOutcomes: SpeakerOutcome[]): boolean {
  if (speakerOutcomes.length < 2) return false;
  const satisfactions = speakerOutcomes.map(o => o.satisfaction);
  return Math.max(...satisfactions) - Math.min(...satisfactions) > TENSION_THRESHOLD;
}

/**
 * Average a numeric property across all speaker outcomes.
 * Used to compute the consolidated card-level Importance and Satisfaction.
 */
export function averageOutcome(
  speakerOutcomes: SpeakerOutcome[],
  key: 'importance' | 'satisfaction',
): number {
  if (!speakerOutcomes.length) return 5;
  const sum = speakerOutcomes.reduce((acc, o) => acc + o[key], 0);
  return sum / speakerOutcomes.length;
}
