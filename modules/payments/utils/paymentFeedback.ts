export type PaymentSuccessSound = { play: () => void; dispose: () => void };

/** Unlock audio on the pay button gesture; play only after server confirmation. */
export function preparePaymentSuccessSound(): PaymentSuccessSound | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  try {
    const context = new window.AudioContext();
    const ready = context.resume().catch(() => undefined);
    let played = false;
    let playing = false;
    let disposed = false;
    const close = () => { if (context.state !== 'closed') void context.close().catch(() => undefined); };
    return {
      play() {
        if (played || disposed) return;
        played = true;
        playing = true;
        void ready.then(() => {
          if (context.state !== 'running') { close(); return; }
          try {
            [660, 880].forEach((frequency, index) => {
              const oscillator = context.createOscillator();
              const gain = context.createGain();
              const at = context.currentTime + index * 0.13;
              oscillator.frequency.setValueAtTime(frequency, at);
              gain.gain.setValueAtTime(0, at);
              gain.gain.linearRampToValueAtTime(0.05, at + 0.015);
              gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
              oscillator.connect(gain);
              gain.connect(context.destination);
              if (index === 1) oscillator.onended = close;
              oscillator.start(at);
              oscillator.stop(at + 0.18);
            });
          } catch { close(); }
        });
      },
      dispose() {
        disposed = true;
        // Navigation to the confirmed booking must not cut off the short chime.
        if (!playing) close();
      },
    };
  } catch { return null; }
}
