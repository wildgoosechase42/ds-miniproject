/**
 * Tiny Web Audio engine for the sort visualiser.
 *
 * Everything is synthesised on the fly — no audio assets. The context is only
 * created inside a user gesture (the "Run QuickSort" click), so browsers never
 * block it.
 */

const PENTATONIC = [0, 2, 4, 7, 9]
const ROOT_HZ = 174.61 // F3
const STEPS = 17

function noteFrequency(step: number): number {
  const clamped = Math.max(0, Math.min(STEPS, step))
  const octave = Math.floor(clamped / PENTATONIC.length)
  const semitone = PENTATONIC[clamped % PENTATONIC.length] + octave * 12
  return ROOT_HZ * Math.pow(2, semitone / 12)
}

type BlipOptions = {
  duration?: number
  gain?: number
  type?: OscillatorType
  /** multiplier applied to the note frequency */
  detune?: number
}

export class SortAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false
  private readonly volume = 0.16

  get isMuted(): boolean {
    return this.muted
  }

  /** Must be called from a user gesture (click/keypress). */
  ensure(): AudioContext | null {
    if (typeof window === "undefined") return null

    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null

      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.ctx.destination)
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume()
    }
    return this.ctx
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.015)
    }
  }

  /** Short percussive note; `value` is 0..1 and maps onto a pentatonic scale. */
  blip(value: number, opts: BlipOptions = {}) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted || ctx.state !== "running") return

    const now = ctx.currentTime
    const freq = noteFrequency(Math.round(value * STEPS)) * (opts.detune ?? 1)
    const duration = opts.duration ?? 0.075
    const peak = opts.gain ?? 0.5

    const osc = ctx.createOscillator()
    const env = ctx.createGain()

    osc.type = opts.type ?? "triangle"
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, now + duration)

    env.gain.setValueAtTime(0.0001, now)
    env.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(env)
    env.connect(master)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  /** Rising arpeggio used when a sort completes. */
  flourish(values: number[] = [0.1, 0.35, 0.6, 0.9]) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const start = ctx.currentTime
    values.forEach((value, i) => {
      const when = start + i * 0.075
      const freq = noteFrequency(Math.round(value * STEPS))
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, when)
      env.gain.setValueAtTime(0.0001, when)
      env.gain.exponentialRampToValueAtTime(0.42, when + 0.01)
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.42)
      osc.connect(env)
      env.connect(this.master!)
      osc.start(when)
      osc.stop(when + 0.45)
    })
  }

  /** Low thunk for "sort started". */
  start() {
    this.blip(0.02, { duration: 0.16, gain: 0.4, type: "sine" })
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
      this.master = null
    }
  }
}
