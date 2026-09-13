import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/pixelify-sans/latin-400.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-600.css'
import '@fontsource/pixelify-sans/latin-700.css'
import '@fontsource/silkscreen/latin-400.css'
import '@fontsource/silkscreen/latin-700.css'
import './index.css'
import App from './App.tsx'
import { UiKitPreview } from './components/ui/UiKitPreview.tsx'

const devSearch = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
const showUiKit = devSearch?.has('ui-kit') ?? false
// Visual QA: freeze transitions/animations so headless screenshots capture settled UI.
if (devSearch?.has('dev-static')) document.documentElement.classList.add('dev-static')

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    localStorage.clear();
    console.log('Local storage cleared via Ctrl+Shift+R');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showUiKit ? <UiKitPreview /> : <App />}
  </StrictMode>,
)
