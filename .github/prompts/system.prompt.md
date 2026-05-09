---
description: "Project system prompt scaffold"
---

# System Prompt

I am building a Vue 3 PWA using the Composition API and script setup syntax. Ensure all AI-related logic uses transformers.js with WebGPU acceleration and offloads heavy processing to Web Workers to keep the UI thread unblocked.

I want to build the UI using Vue 3 SFCs with Scoped CSS. Do not use Tailwind or utility-first frameworks. Use Native CSS Nesting and CSS Custom Properties (Variables) for theming. Keep the markup semantic and use descriptive class names following a simplified BEM or 'Component-first' naming convention.

Always architect heavy AI tasks (transcription, scoring) using Web Workers. Provide a clear communication bridge between the worker.js and the Vue Pinia store to ensure the UI thread remains 60fps.

Strictly adhere to the Strategyn/ODI formula for Opportunity Scores: Importance+max(Importance−Satisfaction,0). When generating drafts, the AI logic should explicitly output the 'Evidence' (quotes) alongside the scores to ensure human verifiability.

Use transformers.js v3 for all model logic. Ensure models are loaded with dtype: 'fp16' or quantized: true to optimize for browser VRAM. Implement a progress-bar state for model downloading and 'warming up' to improve UX.

Technical Constraints for Implementation:

    Framework: Vue 3 (Composition API, <script setup>).

    Styling: Scoped CSS only. Use CSS variables for a "Green/Eco" color palette. No Tailwind.

    AI Logic: Offload all transformers.js tasks to a Web Worker. Use WebGPU for acceleration.

    State: Use Pinia to manage the 'Research Project' state (Transcripts, Job Cards, and Opportunity Scores).

    Privacy: Do not include any external API calls (e.g., Google Analytics or OpenAI). The app must function fully air-gapped once the initial models are cached via Service Worker.

    Thinking Mode: Please use your 'Extended Thinking' to plan the data schema for the multi-speaker tension map before writing the Vue components.

Testing Architecture & QA Standards:

    Framework: Use Vitest Browser Mode for all component and integration tests. Do not use JSDOM, as it lacks WebGPU support.

    Mocking Local AI: Create a mock-transformers utility. Tests should not download 2GB models; instead, mock the pipeline to return static JSON transcripts and scores to verify UI state transitions.

    Formula Validation: Write a dedicated unit test suite for the Strategyn Opportunity Score logic. Include edge cases: I=1,S=10 (Score should be 1) and I=10,S=1 (Score should be 19).

    Worker Testing: Ensure the communication between the Main Thread and the Web Worker is tested using postMessage mocks.

    Persistence Check: Include a test case that verifies data is saved to IndexedDB so that a page refresh doesn't wipe the consultant's work.

I am building a Vue 3 PWA using the Composition API and script setup syntax. Ensure all AI-related logic uses transformers.js with WebGPU acceleration and offloads heavy processing to Web Workers to keep the UI thread unblocked.

I want to build the UI using Vue 3 SFCs with Scoped CSS. Do not use Tailwind or utility-first frameworks. Use Native CSS Nesting and CSS Custom Properties (Variables) for theming. Keep the markup semantic and use descriptive class names following a simplified BEM or 'Component-first' naming convention.

Always architect heavy AI tasks (transcription, scoring) using Web Workers. Provide a clear communication bridge between the worker.js and the Vue Pinia store to ensure the UI thread remains 60fps.

Strictly adhere to the Strategyn/ODI formula for Opportunity Scores: Importance+max(Importance−Satisfaction,0). When generating drafts, the AI logic should explicitly output the 'Evidence' (quotes) alongside the scores to ensure human verifiability.

Use transformers.js v3 for all model logic. Ensure models are loaded with dtype: 'fp16' or quantized: true to optimize for browser VRAM. Implement a progress-bar state for model downloading and 'warming up' to improve UX.

Technical Constraints for Implementation:

    Framework: Vue 3 (Composition API, <script setup>).

    Styling: Scoped CSS only. Use CSS variables for a "Green/Eco" color palette. No Tailwind.

    AI Logic: Offload all transformers.js tasks to a Web Worker. Use WebGPU for acceleration.

    State: Use Pinia to manage the 'Research Project' state (Transcripts, Job Cards, and Opportunity Scores).

    Privacy: Do not include any external API calls (e.g., Google Analytics or OpenAI). The app must function fully air-gapped once the initial models are cached via Service Worker.

    Thinking Mode: Please use your 'Extended Thinking' to plan the data schema for the multi-speaker tension map before writing the Vue components.

Testing Architecture & QA Standards:

    Framework: Use Vitest Browser Mode for all component and integration tests. Do not use JSDOM, as it lacks WebGPU support.

    Mocking Local AI: Create a mock-transformers utility. Tests should not download 2GB models; instead, mock the pipeline to return static JSON transcripts and scores to verify UI state transitions.

    Formula Validation: Write a dedicated unit test suite for the Strategyn Opportunity Score logic. Include edge cases: I=1,S=10 (Score should be 1) and I=10,S=1 (Score should be 19).

    Worker Testing: Ensure the communication between the Main Thread and the Web Worker is tested using postMessage mocks.

    Persistence Check: Include a test case that verifies data is saved to IndexedDB so that a page refresh doesn't wipe the consultant's work.

CRITICAL SUMMARY - NEVER IGNORE:

    DATA PRIVACY: 100% local. No cloud APIs. No Google/OpenAI.

    PERFORMANCE: All AI logic in Web Workers via transformers.js v3 + WebGPU.

    FORMULA: Opportunity = I+max(I−S,0).

    STYLING: Standard Scoped CSS only. NO TAILWIND.

    PROGRESS LOG: After implementing any feature, always append a dated entry to `notes/progress.md`. Record what files were created or changed, key decisions made, and update the "Next Steps" checklist. This keeps the project brief and the coding assistant in sync across sessions.