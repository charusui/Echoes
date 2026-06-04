/**
 * Karplus-Strong plucked string synthesis via AudioWorklet.
 * Must be served from /public/ so addModule() can resolve the URL.
 *
 * Algorithm:
 *  1. Fill circular buffer (length = sampleRate / frequency) with white noise.
 *  2. Each sample: average current + next (one-pole low-pass), multiply by decay factor.
 *  3. Write back and output — produces a realistic plucked string decay.
 */

class KarplusStrongProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = null;
    this._bufferSize = 0;
    this._pointer = 0;
    this._decay = 0.993; // Lute-like: shorter sustain, warm pluck
    this._active = false;

    this.port.onmessage = (event) => {
      const { type, frequency, decay } = event.data;
      if (type === 'pluck') {
        this._pluck(frequency, decay ?? this._decay);
      } else if (type === 'stop') {
        this._active = false;
        this._buffer = null;
      }
    };
  }

  _pluck(frequency, decay) {
    this._decay = decay ?? 0.993;
    this._bufferSize = Math.max(2, Math.round(sampleRate / frequency));
    this._buffer = new Float32Array(this._bufferSize);

    // Fill with white noise (the excitation burst)
    for (let i = 0; i < this._bufferSize; i++) {
      this._buffer[i] = Math.random() * 2 - 1;
    }

    this._pointer = 0;
    this._active = true;
  }

  process(_inputs, outputs) {
    const channel = outputs[0][0];

    if (!this._active || !this._buffer) {
      // Output silence
      if (channel) channel.fill(0);
      return true;
    }

    for (let i = 0; i < channel.length; i++) {
      const nextPointer = (this._pointer + 1) % this._bufferSize;

      // One-pole low-pass filter + decay factor
      const sample = (this._buffer[this._pointer] + this._buffer[nextPointer]) * 0.5 * this._decay;

      this._buffer[this._pointer] = sample;
      channel[i] = sample;
      this._pointer = nextPointer;
    }

    return true;
  }
}

registerProcessor('karplus-strong-processor', KarplusStrongProcessor);
