/**
 * Web Worker lookahead audio scheduler.
 * Ticks every 25ms, allowing the main thread to schedule
 * audio notes 100ms ahead via AudioContext.currentTime.
 * This isolates audio timing from main-thread jank.
 */

let timerID = null;

self.onmessage = (e) => {
  if (e.data === 'start') {
    if (timerID !== null) clearInterval(timerID);
    timerID = setInterval(() => self.postMessage('tick'), 25);
  } else if (e.data === 'stop') {
    if (timerID !== null) {
      clearInterval(timerID);
      timerID = null;
    }
  }
};
