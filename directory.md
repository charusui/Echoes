# Codebase Directory Guide: Musikultura

This guide explains the project structure, directory layout, and what each file does. Use this reference to quickly locate files and understand how they interact.

---

## 📂 Root Directory
* [index.html](./index.html) - Main HTML entry point. Configures the viewport, title, and Apple touch icons.
* [package.json](./package.json) - Node dependencies and scripts (`dev`, `build`, `preview`).
* [tsconfig.json](./tsconfig.json) - TypeScript parent configuration.
* [vercel.json](./vercel.json) - Vercel configuration for deployment redirects.
* [vite.config.ts](./vite.config.ts) - Vite configuration utilizing the React compiler plugin.
* [Musikultura GDD.pdf](./Echoes%20of%20the%20Ancestors%20GDD.pdf) - Game Design Document outlining mechanics, levels, and narrative.

---

## 📂 src Directory
* [main.tsx](./src/main.tsx) - Mounts the React application inside the index DOM node.
* [App.tsx](./src/App.tsx) - Core router and layout controller of the game. Manages views (`title`, `map`, `game`, `story`, `quiz`, `collection`, `results`, `scanner`, `location-services`).
* [index.css](./src/index.css) - General design system stylesheet. Sets up themes, variables, animations, scrollbars, and fonts (Inter, Space Mono, Orbitron).
* [App.css](./src/App.css) - UI layout styling, scan animations, and button styles.
* [constants.ts](./src/constants.ts) - Game constants including details for Visayas regions (Western, Central, Eastern, Negros), levels, instruments, coordinates, and default data.

---

## 📂 src/components Directory
This folder contains all the interactive screens and UI elements:

| File Name | Purpose / Function |
| :--- | :--- |
| [TitleScreen.tsx](./src/components/TitleScreen.tsx) | The introductory landing page. Features the map backdrop (`/visayas_map.png`) and the "Tap to Begin" start interaction. |
| [MapScreen.tsx](./src/components/MapScreen.tsx) | The interactive main region selector map. Handles unlocking pins based on player level. |
| [CollectionScreen.tsx](./src/components/CollectionScreen.tsx) | Displays locked and unlocked cultural instruments. **Dynamically calls the instrument PNG files** from `/public/instruments/`. |
| [DiscoveryCard.tsx](./src/components/DiscoveryCard.tsx) | **Houses the flippable 3D card layout.** Front side displays image & summary; back side displays history, region, and materials. |
| [GameBoard.tsx](./src/components/GameBoard.tsx) | Main container for the interactive gameplay. Directs gameplay loop to specific rhythm interfaces. |
| [ResultsScreen.tsx](./src/components/ResultsScreen.tsx) | Post-game dashboard displaying score, accuracy metrics, streak counts, sound clips, and level advancement status. |
| [StoryScreen.tsx](./src/components/StoryScreen.tsx) | Narrative text overlay displaying regional folktales and options with visual glow-themed letter blocks (`A`, `B`, `C`). |
| [QuizScreen.tsx](./src/components/QuizScreen.tsx) | Multiple-choice questions testing player knowledge of cultural history. Formatted in a premium glassmorphic list. |
| [Scanner.tsx](./src/components/Scanner.tsx) | AR mock scanner utilizing device media streams or canvas fallbacks to capture images and send them to the Gemini API. |
| [LocationServicesScreen.tsx](./src/components/LocationServicesScreen.tsx) | Simulates real-time map GPS tracking using Leaflet to locate and scan regional instruments. |
| [TnalakWeave.tsx](./src/components/TnalakWeave.tsx) | Renders a dynamic canvas pattern background matching indigenous weaving designs (T'nalak/hablon patterns). |
| [PipelineConsole.tsx](./src/components/PipelineConsole.tsx) | Developer debugging deck showing Gemini prompt construction, logs, input frame grids, generated JSONs, and latency charts. |
| [OnboardingScreen.tsx](./src/components/OnboardingScreen.tsx) | The opening tutorial dialog providing introduction narrative. |
| [RhythmHighway.tsx](./src/components/RhythmHighway.tsx) | Renders the vertical track with note items scrolling downward, including execution timing indicators. |
| [StringRhythm.tsx](./src/components/StringRhythm.tsx) | Controls visual rhythm targets specifically for string chord play. |
| [StringEngine.tsx](./src/components/StringEngine.tsx) | Virtual keyboard/plucking interface to play string instrument patterns directly. |
| [PercussionRhythm.tsx](./src/components/PercussionRhythm.tsx) | Manages note visual hit tracks for percussion instruments. |
| [PercussionEngine.tsx](./src/components/PercussionEngine.tsx) | Drum pad simulation interface mapping percussion controls. |
| [WindRhythm.tsx](./src/components/WindRhythm.tsx) | Interactive note targeting for flute/reed wind tracks. |
| [WindEngine.tsx](./src/components/WindEngine.tsx) | Blow/key simulation engine utilizing microphone/volume filters. |
| [ErrorBoundary.tsx](./src/components/ErrorBoundary.tsx) | Intercepts runtime application errors to prevent complete crashes. |

---

## 📂 src/components/expedition Directory
This folder contains the core files for the RPG mode (Project Expedition):

| File Name | Purpose / Function |
| :--- | :--- |
| [ExpeditionOverworld.tsx](./src/components/expedition/ExpeditionOverworld.tsx) | Main exploration map view for the RPG mode. Handles party movement, pathfinding, NPC dialogues, and triggering encounters. |
| [ExpeditionCombat.tsx](./src/components/expedition/ExpeditionCombat.tsx) | The combat router that switches the view between different types of battles (Standard, Wakwak, Bakunawa, etc.). |
| [useCombatEngine.ts](./src/components/expedition/useCombatEngine.ts) | The core state engine hook that manages turn orders, action points (AP), health (HP), stagger bars, and status effects. |
| [StandardCombat.tsx](./src/components/expedition/StandardCombat.tsx) | The battle arena used for normal enemy encounters like Bandits and Corrupted Instruments. |
| [WakwakBossCombat.tsx](./src/components/expedition/WakwakBossCombat.tsx) | Specialized battle arena for the Wakwak boss fight. |
| [HarmonyStage.tsx](./src/components/expedition/HarmonyStage.tsx) | Specialized battle arena for the Bakunawa boss fight (includes dodging mechanics and bullet hell). |
| [AsuangBossBattle.tsx](./src/components/expedition/AsuangBossBattle.tsx) | Specialized battle arena for the Asuang boss fight. |
| [RhythmHighwayOverlay.tsx](./src/components/expedition/RhythmHighwayOverlay.tsx) | The rhythm minigame overlay used for executing standard Rhythm Attacks. |
| [SpellCastingOverlay.tsx](./src/components/expedition/SpellCastingOverlay.tsx) | The tracing/drawing minigame overlay used for casting Overdrive skills. |
| [UltimateSequenceOverlay.tsx](./src/components/expedition/UltimateSequenceOverlay.tsx) | The sequence overlay for casting ultimate spells. |
| [ParryQteOverlay.tsx](./src/components/expedition/ParryQteOverlay.tsx) | The quick-time event (QTE) overlay for parrying enemy attacks during their turn. |
| [AttuneCaptureOverlay.tsx](./src/components/expedition/AttuneCaptureOverlay.tsx) | The minigame overlay for capturing/attuning weakened corrupted instruments. |
| [WingSlamCounterMinigame.tsx](./src/components/expedition/WingSlamCounterMinigame.tsx) | A specific QTE minigame used to counter the Bakunawa's wing slam attack. |
| [EquipmentModal.tsx](./src/components/expedition/EquipmentModal.tsx) | The party inventory screen for equipping instruments and checking stats. |
| [MariaShopModal.tsx](./src/components/expedition/MariaShopModal.tsx) | The interactive shop interface for buying items, upgrades, and managing currency. |
| [QuestsModal.tsx](./src/components/expedition/QuestsModal.tsx) | The active quest log and progression tracker. |
| [HarmonydexModal.tsx](./src/components/expedition/HarmonydexModal.tsx) | The encyclopedia that tracks encountered enemies and captured instruments. |
| [CombatResultModal.tsx](./src/components/expedition/CombatResultModal.tsx) | The post-battle screen that displays victory/defeat status, XP gained, and level ups. |
| [CrossroadsCutscene.tsx](./src/components/expedition/CrossroadsCutscene.tsx) | Handles the story and dialogue cutscenes that occur between different map nodes. |

---

## 📂 src/context Directory
* [ProgressProvider.tsx](./src/context/ProgressProvider.tsx) - Core global progress manager. Handles unlocked levels, streaks, total scores, items found, and persists save-states to local storage.
* [GeminiProvider.tsx](./src/context/GeminiProvider.tsx) - Coordinates the Vercel edge endpoints and direct Gemini API configurations using local environment variables.

---

## 📂 src/hooks Directory
* [useRhythmGame.ts](./src/hooks/useRhythmGame.ts) - The central game-loop state engine. Calculates scores, combo multiplier offsets, absolute timings, and handles note deletion/addition.
* [useAudioContext.ts](./src/hooks/useAudioContext.ts) - Initiates standard audio pipelines and registers synthesis processors.

---

## 📂 src/services Directory
* [audioSynth.ts](./src/services/audioSynth.ts) - Programmatic audio synthesizers generating Cebuano Gitara (plucked acoustic strings), Tultugan (hollow bamboo resonant pulses), Tulali (flutes), and percussion sounds.
* [geminiPipeline.ts](./src/services/geminiPipeline.ts) - Pipeline client interacting with Google Gemini. Receives images, structures details JSONs, formats stories, builds custom quizzes, and maps audio patterns into structured rhythm tracks.
* [chartGenerator.ts](./src/services/chartGenerator.ts) - Programmatic fallback system constructing gameplay note sequences when offline.
* [fallbackTracks.ts](./src/services/fallbackTracks.ts) - Hardcoded backup storyboards, quiz databases, and instrument details to ensure fully offline readiness.

---

## 📂 src/types Directory
* [index.ts](./src/types/index.ts) - Game data model definitions (e.g. `Instrument`, `RhythmNote`, `GameProgress`, `LevelData`, `QuizQuestion`).

---

## 📂 public Directory
All static imagery, PWA manifests, and processing workers are housed neatly under `public/assets/`:
* [icon-192.png](./public/assets/icon-192.png) / [icon-512.png](./public/assets/icon-512.png) - System icons.
* [karplus-strong-processor.js](./public/assets/karplus-strong-processor.js) - Low-level AudioWorkletProcessor script for procedural plucked-string synth.
* [scheduler-worker.js](./public/assets/scheduler-worker.js) - Accurate timer web worker for the game engine.
* [site.webmanifest](./public/assets/site.webmanifest) - PWA setup file.
* `public/assets/instruments/` - Individual PNG assets for each unlocked and locked instrument.
* `public/assets/avatars/` - Student avatars and stickers.
* `public/assets/badges/` - Game achievement badge PNGs.
* `public/assets/expedition/` - Overworld and combat backgrounds and spritesheets.
* `public/assets/audio/` - Background music and song audio files.
