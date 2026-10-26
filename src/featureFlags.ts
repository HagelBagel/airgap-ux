/**
 * featureFlags.ts
 *
 * Single source of truth for all feature flags.
 * Real inference is now the default. Set VITE_MOCK_MODE=true to force
 * Fast UI Mode (pre-canned data) for local UI-only development.
 *
 *   true  → Fast UI Mode: worker returns mock data instantly, no GPU needed.
 *   false → Real AI Mode: in-browser JTBD extraction with the local LLM.
 */
const mockModeFromEnv = import.meta.env.VITE_MOCK_MODE;

/**
 * Mock mode default is OFF to ensure dropped files trigger real analysis.
 * Override with VITE_MOCK_MODE=true when intentionally testing mock flows.
 */
export const MOCK_MODE = mockModeFromEnv === 'true';
