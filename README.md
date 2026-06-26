# Musikultura 🪕

A mobile-first rhythm and discovery game that takes players on a journey across the **Visayas** islands of the Philippines, scanning and unlocking traditional indigenous instruments — from the **Cebuano Gitara** and **Octavina** to the **Tultugan**, **Tulali**, and **Korlong** — while learning the folklore, history, and cultural significance behind each one.

Built with **React 19 + TypeScript + Vite**, using **Tailwind CSS**, **Leaflet** for map interactions, the **Web Audio API** for procedural instrument synthesis, and **Google Gemini** to power AR-style scanning, story generation, and rhythm chart creation.

---

## ✨ Features

- **Interactive Visayas Map** — Explore Western, Central, Eastern Visayas, and Negros regions, unlocking new areas as you progress.
- **AR-style Scanner** — Point your camera (or use the canvas fallback) and let Gemini identify and verify instruments.
- **Rhythm Gameplay** — Genre-specific engines for string, percussion, and wind instruments, each with their own note highways and hit-timing logic.
- **Procedural Audio Synthesis** — Custom Karplus-Strong plucked-string model and synthesized percussion/wind sounds via AudioWorklets.
- **Instrument Collection** — A flippable card gallery showing history, region of origin, and materials for each unlocked instrument.
- **Story & Quiz Screens** — Regional folktales and cultural trivia woven into the gameplay loop.
- **Offline-Ready** — Hardcoded fallback tracks, stories, and quiz data ensure the game works even without an active Gemini connection.
- **Dev Tools** — A built-in Pipeline Console and Dev Menu for inspecting Gemini prompts, logs, and generated rhythm charts.

---

## 🛠️ Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet, react-leaflet |
| Audio | Web Audio API, AudioWorklet (Karplus-Strong synthesis) |
| AI / Backend | Google Gemini (`@google/genai`) |
| Icons | Lucide React |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS recommended)
- A [Google Gemini API key](https://ai.google.dev/)

### Installation

```bash
git clone https://github.com/charusui/Echoes.git
cd Echoes
npm install
```

### Environment Setup

Copy the example environment file and add your Gemini API key:

```bash
cp .env.example .env
```

```
VITE_GEMINI_API_KEY=your_key_here
```

> ⚠️ The Gemini API key is baked in at build time. This project is intended as a self-hosted demo — never expose your `.env` file or commit it to version control.

### Run the Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```
src/
├── components/    # Screens & UI (TitleScreen, MapScreen, GameBoard, Scanner, etc.)
├── context/        # Global providers (Progress, Gemini)
├── hooks/           # Core game-loop and audio hooks
├── services/        # Audio synthesis, Gemini pipeline, chart generation, fallbacks
├── types/           # Shared TypeScript data models
└── constants.ts     # Colors, scoring, timing windows, instrument data

public/
├── instruments/     # Instrument artwork (locked & unlocked states)
├── avatars/         # Character art and stickers
└── visayas_map.png  # Title/map background
```

See [`directory.md`](./directory.md) for a full file-by-file breakdown.

---

## 🎮 Gameplay Flow

1. **Title → Onboarding** — Intro narrative and tutorial.
2. **Map** — Select an unlocked region of the Visayas.
3. **Scanner** — Use AR scanning to discover an instrument.
4. **Rhythm Game** — Play a genre-specific rhythm chart (string, percussion, or wind).
5. **Results** — View score, accuracy, streaks, and progression.
6. **Story & Quiz** — Learn the folklore behind the instrument and test your knowledge.
7. **Collection** — Browse all instruments discovered so far.

---

## 🤝 Contributing

This project was built for a hackathon. Issues and pull requests are welcome — please open an issue to discuss any major changes first.

---

## 🧩 Appendix: Vite + React + TypeScript Template Notes

This project was bootstrapped from the official Vite React + TypeScript template, which provides a minimal setup for React with HMR and ESLint rules.

Two official Vite plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) — uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) — uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template due to its impact on dev & build performance. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint Configuration

For production applications, consider enabling type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# 
<div align = "center"> Made with 💖 by Viray, Charles - Halili, Joshua - David, Kiel </div>
