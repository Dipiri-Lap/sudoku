/**
 * Tiny Pieces BGM — small procedural loops played with Web Audio (no audio files).
 * Each track = tempo + chord progression + bass + melody pattern + instrument voices.
 */

export interface BgmTrack {
    id: string;
    name: string;
    desc: string;
}

type Voice = 'pluck' | 'bell' | 'square' | 'pad' | 'soft';

interface TrackDef extends BgmTrack {
    bpm: number;
    /** chord roots per bar (MIDI) + chord type */
    chords: [number, 'maj' | 'min' | 'maj7' | 'min7' | 'sus'][];
    /** melody per bar: 8 eighth-note steps, scale degrees offset (semitones from chord root+12) or null */
    melody: (number | null)[][];
    lead: Voice;
    harmony: Voice;
    bass: Voice;
    /** harmony rhythm: 'arp' (eighth arpeggio) | 'block' (half-note chords) | 'offbeat' */
    comp: 'arp' | 'block' | 'offbeat';
    swing?: number;
    vol: number;
}

const CHORD: Record<string, number[]> = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    sus: [0, 5, 7],
};

const TRACKS: TrackDef[] = [
    {
        id: 'stroll',
        name: '햇살 산책',
        desc: '통통 튀는 우쿨렐레 느낌',
        bpm: 112,
        chords: [[60, 'maj'], [67, 'maj'], [69, 'min'], [65, 'maj']],
        melody: [
            [12, null, 16, 19, 16, null, 14, 12],
            [11, null, 14, null, 19, 17, 14, null],
            [12, null, 15, 19, 17, 15, 12, null],
            [12, 14, 16, null, 17, 16, 14, null],
        ],
        lead: 'pluck', harmony: 'pluck', bass: 'soft', comp: 'offbeat', vol: 0.9,
    },
    {
        id: 'chiptune',
        name: '꼬마 모험',
        desc: '귀여운 8비트 게임 음악',
        bpm: 128,
        chords: [[60, 'maj'], [57, 'min'], [65, 'maj'], [67, 'maj']],
        melody: [
            [12, 16, 19, 16, 24, null, 19, null],
            [15, 19, 22, null, 19, 15, 12, null],
            [12, null, 16, 12, 19, 16, 14, 12],
            [14, null, 17, 14, 19, null, 23, null],
        ],
        lead: 'square', harmony: 'square', bass: 'square', comp: 'arp', vol: 0.5,
    },
];

export const BGM_TRACKS: BgmTrack[] = TRACKS.map(({ id, name, desc }) => ({ id, name, desc }));

const PREF_KEY = 'jigsaw-bgm';
export function loadBgmPref(): string {
    try {
        const v = localStorage.getItem(PREF_KEY);
        if (v === 'off' || TRACKS.some((t) => t.id === v)) return v as string;
    } catch {
        /* ignore */
    }
    return TRACKS[0].id;
}
export function saveBgmPref(id: string) {
    try {
        localStorage.setItem(PREF_KEY, id);
    } catch {
        /* ignore */
    }
}

const VOL_KEY = 'jigsaw-volume';
/** 0~1 volumes for background music and sound effects */
export function loadVolumes(): { bgm: number; sfx: number } {
    try {
        const v = JSON.parse(localStorage.getItem(VOL_KEY) ?? 'null');
        if (v && typeof v.bgm === 'number' && typeof v.sfx === 'number') {
            return { bgm: Math.min(1, Math.max(0, v.bgm)), sfx: Math.min(1, Math.max(0, v.sfx)) };
        }
    } catch {
        /* ignore */
    }
    return { bgm: 0.7, sfx: 0.8 };
}
export function saveVolumes(v: { bgm: number; sfx: number }) {
    try {
        localStorage.setItem(VOL_KEY, JSON.stringify(v));
    } catch {
        /* ignore */
    }
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class BgmPlayer {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private track: TrackDef | null = null;
    private timer: number | null = null;
    private nextTime = 0;
    private step = 0;
    private volume = loadVolumes().bgm;
    private ducked = false;

    private ensure() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0;
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    private target() {
        return (this.ducked ? 0.12 : 0.32) * (this.track?.vol ?? 1) * this.volume;
    }

    setVolume(v: number) {
        this.volume = v;
        if (!this.ctx || !this.master || !this.track) return;
        const t = this.ctx.currentTime;
        const g = this.master.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(this.target(), t + 0.1);
    }

    get playingId() {
        return this.track?.id ?? null;
    }

    play(id: string) {
        const def = TRACKS.find((t) => t.id === id);
        if (!def) return this.stop();
        if (this.track?.id === id && this.timer !== null) return;
        this.stop(true);
        const ctx = this.ensure();
        this.track = def;
        this.step = 0;
        this.nextTime = ctx.currentTime + 0.1;
        const g = this.master!.gain;
        g.cancelScheduledValues(ctx.currentTime);
        g.setValueAtTime(0, ctx.currentTime);
        this.ducked = false;
        g.linearRampToValueAtTime(this.target(), ctx.currentTime + 1.2);
        this.timer = window.setInterval(() => this.schedule(), 60);
        this.schedule();
    }

    stop(immediate = false) {
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        this.track = null;
        if (this.ctx && this.master) {
            const t = this.ctx.currentTime;
            const g = this.master.gain;
            g.cancelScheduledValues(t);
            g.setValueAtTime(g.value, t);
            g.linearRampToValueAtTime(0, t + (immediate ? 0.05 : 0.6));
        }
    }

    /** dim while a popup (win screen) is open */
    duck(on: boolean) {
        if (!this.ctx || !this.master || !this.track) return;
        const t = this.ctx.currentTime;
        const g = this.master.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        this.ducked = on;
        g.linearRampToValueAtTime(this.target(), t + 0.5);
    }

    private schedule() {
        const ctx = this.ctx;
        const tr = this.track;
        if (!ctx || !tr) return;
        const eighth = 60 / tr.bpm / 2;
        while (this.nextTime < ctx.currentTime + 0.25) {
            this.playStep(tr, this.step, this.nextTime, eighth);
            const swing = tr.swing && this.step % 2 === 0 ? eighth * tr.swing : tr.swing ? -eighth * tr.swing : 0;
            this.nextTime += eighth + swing;
            this.step = (this.step + 1) % (tr.chords.length * 8);
        }
    }

    private playStep(tr: TrackDef, step: number, t: number, eighth: number) {
        const bar = Math.floor(step / 8);
        const s = step % 8;
        const [root, type] = tr.chords[bar];
        const tones = CHORD[type].map((x) => root + x);
        // bass: beat 1 and 3
        if (s === 0 || s === 4) this.note(tr.bass, root - 24 + (s === 4 && tr.comp !== 'block' ? 7 : 0), t, eighth * 3.5, 0.55);
        // comp
        if (tr.comp === 'arp') {
            const order = [0, 1, 2, 1, 0, 2, 1, 2];
            const n = tones[order[s] % tones.length];
            this.note(tr.harmony, n, t, eighth * 1.6, 0.22);
        } else if (tr.comp === 'offbeat') {
            if (s % 2 === 1) tones.forEach((n) => this.note(tr.harmony, n, t, eighth * 0.9, 0.11));
        } else if (s === 0 || s === 4) {
            tones.forEach((n) => this.note(tr.harmony, n - 12, t, eighth * 4, 0.1));
        }
        // melody
        const m = tr.melody[bar % tr.melody.length][s];
        if (m !== null && m !== undefined) {
            let len = 1;
            const row = tr.melody[bar % tr.melody.length];
            while (s + len < 8 && row[s + len] === null && len < 3) len++;
            this.note(tr.lead, root + m, t, eighth * len * 0.95, 0.34);
        }
    }

    private note(voice: Voice, midi: number, t: number, dur: number, vel: number) {
        const ctx = this.ctx!;
        const out = ctx.createGain();
        out.connect(this.master!);
        const f = freq(midi);
        const env = (attack: number, release: number, peak = vel) => {
            out.gain.setValueAtTime(0, t);
            out.gain.linearRampToValueAtTime(peak, t + attack);
            out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.02) + release);
        };
        const osc = (type: OscillatorType, fr: number, detune = 0) => {
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = fr;
            o.detune.value = detune;
            return o;
        };
        let oscs: OscillatorNode[] = [];
        let end = t + dur + 0.6;
        switch (voice) {
            case 'pluck': {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(3200, t);
                lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
                lp.connect(out);
                oscs = [osc('triangle', f), osc('sawtooth', f, 4)];
                oscs[1].connect(lp);
                oscs[0].connect(lp);
                out.gain.setValueAtTime(0, t);
                out.gain.linearRampToValueAtTime(vel * 0.7, t + 0.005);
                out.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
                end = t + 0.5;
                break;
            }
            case 'bell': {
                oscs = [osc('sine', f), osc('sine', f * 2.01), osc('sine', f * 3.98)];
                const g2 = ctx.createGain();
                g2.gain.value = 0.25;
                oscs[0].connect(out);
                oscs[1].connect(g2);
                oscs[2].connect(g2);
                g2.connect(out);
                out.gain.setValueAtTime(0, t);
                out.gain.linearRampToValueAtTime(vel * 0.8, t + 0.003);
                out.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
                end = t + 1.5;
                break;
            }
            case 'square': {
                oscs = [osc('square', f)];
                oscs[0].connect(out);
                env(0.005, 0.05, vel * 0.35);
                break;
            }
            case 'pad': {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 900;
                lp.connect(out);
                oscs = [osc('sawtooth', f, -7), osc('sawtooth', f, 7)];
                oscs.forEach((o) => o.connect(lp));
                env(0.35, 0.8, vel * 0.5);
                end = t + dur + 1;
                break;
            }
            case 'soft':
            default: {
                oscs = [osc('triangle', f), osc('sine', f * 2)];
                const g2 = ctx.createGain();
                g2.gain.value = 0.15;
                oscs[0].connect(out);
                oscs[1].connect(g2);
                g2.connect(out);
                env(0.02, 0.25);
                break;
            }
        }
        oscs.forEach((o) => {
            o.start(t);
            o.stop(end);
        });
    }
}

export const bgm = new BgmPlayer();
