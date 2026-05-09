/**
 * Strategyn / Outcome-Driven Innovation (ODI) scoring formula.
 *
 * Opportunity Score = I + max(I − S, 0)
 *
 * Where:
 *   I = Importance   (1–10) — how critical the outcome is to the user
 *   S = Satisfaction (1–10) — how well the current solution delivers it
 *
 * Interpretation:
 *   > 15  → Over-served (high opp if you can cut cost/complexity)
 *   10–15 → Prime opportunity (important + under-served)
 *   < 10  → Low priority
 */

/**
 * Compute the Opportunity Score for a single Desired Outcome.
 * Both inputs are clamped to [1, 10] before calculation.
 */
export function computeOpportunityScore(importance: number, satisfaction: number): number {
  const I = clamp(importance, 1, 10);
  const S = clamp(satisfaction, 1, 10);
  return I + Math.max(I - S, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
