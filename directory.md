# Codebase Directory Guide: Musikultura

This guide explains the project structure, directory layout, and what each file does. Use this reference to quickly locate files and understand how they interact.

---

## 📂 Root Directory
* [index.html](file:///c:/Users/duvey/Downloads/filinstruments/index.html) - Main HTML entry point. Configures the viewport, title, and Apple touch icons.
* [package.json](file:///c:/Users/duvey/Downloads/filinstruments/package.json) - Node dependencies and scripts (`dev`, `build`, `preview`).
* [tsconfig.json](file:///c:/Users/duvey/Downloads/filinstruments/tsconfig.json) - TypeScript parent configuration.
* [vercel.json](file:///c:/Users/duvey/Downloads/filinstruments/vercel.json) - Vercel configuration for deployment redirects.
* [vite.config.ts](file:///c:/Users/duvey/Downloads/filinstruments/vite.config.ts) - Vite configuration utilizing the React compiler plugin.
* [Musikultura GDD.pdf](file:///c:/Users/duvey/Downloads/filinstruments/Echoes%20of%20the%20Ancestors%20GDD.pdf) - Game Design Document outlining mechanics, levels, and narrative.

---

## 📂 src Directory
* [main.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/main.tsx) - Mounts the React application inside the index DOM node.
* [App.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/App.tsx) - Core router and layout controller of the game. Manages views (`title`, `map`, `game`, `story`, `quiz`, `collection`, `results`, `scanner`, `location-services`).
* [index.css](file:///c:/Users/duvey/Downloads/filinstruments/src/index.css) - General design system stylesheet. Sets up themes, variables, animations, scrollbars, and fonts (Inter, Space Mono, Orbitron).
* [App.css](file:///c:/Users/duvey/Downloads/filinstruments/src/App.css) - UI layout styling, scan animations, and button styles.
* [constants.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/constants.ts) - Game constants including details for Visayas regions (Western, Central, Eastern, Negros), levels, instruments, coordinates, and default data.

---

## 📂 src/components Directory
This folder contains all the interactive screens and UI elements:

| File Name | Purpose / Function |
| :--- | :--- |
| [TitleScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/TitleScreen.tsx) | The introductory landing page. Features the map backdrop (`/visayas_map.png`) and the "Tap to Begin" start interaction. |
| [MapScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/MapScreen.tsx) | The interactive main region selector map. Handles unlocking pins based on player level. |
| [CollectionScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/CollectionScreen.tsx) | Displays locked and unlocked cultural instruments. **Dynamically calls the instrument PNG files** from `/public/instruments/`. |
| [DiscoveryCard.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/DiscoveryCard.tsx) | **Houses the flippable 3D card layout.** Front side displays image & summary; back side displays history, region, and materials. |
| [GameBoard.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/GameBoard.tsx) | Main container for the interactive gameplay. Directs gameplay loop to specific rhythm interfaces. |
| [ResultsScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/ResultsScreen.tsx) | Post-game dashboard displaying score, accuracy metrics, streak counts, sound clips, and level advancement status. |
| [StoryScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/StoryScreen.tsx) | Narrative text overlay displaying regional folktales and options with visual glow-themed letter blocks (`A`, `B`, `C`). |
| [QuizScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/QuizScreen.tsx) | Multiple-choice questions testing player knowledge of cultural history. Formatted in a premium glassmorphic list. |
| [Scanner.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/Scanner.tsx) | AR mock scanner utilizing device media streams or canvas fallbacks to capture images and send them to the Gemini API. |
| [LocationServicesScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/LocationServicesScreen.tsx) | Simulates real-time map GPS tracking using Leaflet to locate and scan regional instruments. |
| [TnalakWeave.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/TnalakWeave.tsx) | Renders a dynamic canvas pattern background matching indigenous weaving designs (T'nalak/hablon patterns). |
| [PipelineConsole.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/PipelineConsole.tsx) | Developer debugging deck showing Gemini prompt construction, logs, input frame grids, generated JSONs, and latency charts. |
| [OnboardingScreen.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/OnboardingScreen.tsx) | The opening tutorial dialog providing introduction narrative. |
| [RhythmHighway.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/RhythmHighway.tsx) | Renders the vertical track with note items scrolling downward, including execution timing indicators. |
| [StringRhythm.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/StringRhythm.tsx) | Controls visual rhythm targets specifically for string chord play. |
| [StringEngine.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/StringEngine.tsx) | Virtual keyboard/plucking interface to play string instrument patterns directly. |
| [PercussionRhythm.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/PercussionRhythm.tsx) | Manages note visual hit tracks for percussion instruments. |
| [PercussionEngine.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/PercussionEngine.tsx) | Drum pad simulation interface mapping percussion controls. |
| [WindRhythm.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/WindRhythm.tsx) | Interactive note targeting for flute/reed wind tracks. |
| [WindEngine.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/WindEngine.tsx) | Blow/key simulation engine utilizing microphone/volume filters. |
| [ErrorBoundary.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/components/ErrorBoundary.tsx) | Intercepts runtime application errors to prevent complete crashes. |

---

## 📂 src/context Directory
* [ProgressProvider.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/context/ProgressProvider.tsx) - Core global progress manager. Handles unlocked levels, streaks, total scores, items found, and persists save-states to local storage.
* [GeminiProvider.tsx](file:///c:/Users/duvey/Downloads/filinstruments/src/context/GeminiProvider.tsx) - Coordinates the Vercel edge endpoints and direct Gemini API configurations using local environment variables.

---

## 📂 src/hooks Directory
* [useRhythmGame.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/hooks/useRhythmGame.ts) - The central game-loop state engine. Calculates scores, combo multiplier offsets, absolute timings, and handles note deletion/addition.
* [useAudioContext.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/hooks/useAudioContext.ts) - Initiates standard audio pipelines and registers synthesis processors.

---

## 📂 src/services Directory
* [audioSynth.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/services/audioSynth.ts) - Programmatic audio synthesizers generating Cebuano Gitara (plucked acoustic strings), Tultugan (hollow bamboo resonant pulses), Tulali (flutes), and percussion sounds.
* [geminiPipeline.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/services/geminiPipeline.ts) - Pipeline client interacting with Google Gemini. Receives images, structures details JSONs, formats stories, builds custom quizzes, and maps audio patterns into structured rhythm tracks.
* [chartGenerator.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/services/chartGenerator.ts) - Programmatic fallback system constructing gameplay note sequences when offline.
* [fallbackTracks.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/services/fallbackTracks.ts) - Hardcoded backup storyboards, quiz databases, and instrument details to ensure fully offline readiness.

---

## 📂 src/types Directory
* [index.ts](file:///c:/Users/duvey/Downloads/filinstruments/src/types/index.ts) - Game data model definitions (e.g. `Instrument`, `RhythmNote`, `GameProgress`, `LevelData`, `QuizQuestion`).

---

## 📂 public Directory
All static imagery, PWA manifests, and processing workers are housed neatly under `public/assets/`:
* [icon-192.png](file:///c:/Users/duvey/Downloads/filinstruments/public/assets/icon-192.png) / [icon-512.png](file:///c:/Users/duvey/Downloads/filinstruments/public/assets/icon-512.png) - System icons.
* [karplus-strong-processor.js](file:///c:/Users/duvey/Downloads/filinstruments/public/assets/karplus-strong-processor.js) - Low-level AudioWorkletProcessor script for procedural plucked-string synth.
* [scheduler-worker.js](file:///c:/Users/duvey/Downloads/filinstruments/public/assets/scheduler-worker.js) - Accurate timer web worker for the game engine.
* [site.webmanifest](file:///c:/Users/duvey/Downloads/filinstruments/public/assets/site.webmanifest) - PWA setup file.
* `public/assets/instruments/` - Individual PNG assets for each unlocked and locked instrument.
* `public/assets/avatars/` - Student avatars and stickers.
* `public/assets/badges/` - Game achievement badge PNGs.
* `public/assets/expedition/` - Overworld and combat backgrounds and spritesheets.
* `public/assets/audio/` - Background music and song audio files.
