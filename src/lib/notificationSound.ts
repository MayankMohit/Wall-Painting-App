// Single module-level AudioContext that's reused across notification chimes.
// Browsers cap simultaneous AudioContexts (Chrome warns at ~6); creating a new
// one per chime exhausts the budget within a session and the sound stops.
let _ctx: AudioContext | null = null;

export function playNotificationSound(muted: boolean): void {
  if (muted || typeof window === 'undefined') return;
  try {
    if (!_ctx) _ctx = new AudioContext();
    // Browser auto-suspends the context until a user gesture; resume() is a
    // no-op when already running and harmless before any gesture.
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    const ctx = _ctx;
    const notes = [880, 659]; // A5 → E5 descending chime
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type            = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch {}
}
