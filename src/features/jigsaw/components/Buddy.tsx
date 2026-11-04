import { BUDDY_SKINS, type BuddySkin } from '../data/buddySkins';

const O = '#3a3046';

/** accessories drawn behind the body */
function Back({ acc }: { acc?: BuddySkin['acc'] }) {
    if (acc === 'crown')
        return (
            <g stroke={O} strokeWidth="2" strokeLinejoin="round">
                <path d="M6 22 Q30 12 54 22 L60 60 Q30 66 0 60 Z" fill="#d6304a" />
                <path d="M6 22 Q30 12 54 22 L55 30 Q30 22 5 30 Z" fill="#ffffff" />
                <circle cx="14" cy="26" r="1.6" fill={O} stroke="none" />
                <circle cx="30" cy="22" r="1.6" fill={O} stroke="none" />
                <circle cx="46" cy="26" r="1.6" fill={O} stroke="none" />
            </g>
        );
    if (acc === 'angel')
        return (
            <g fill="#ffffff" stroke={O} strokeWidth="2" strokeLinejoin="round">
                <path className="jg-wing-l" d="M10 30 C-8 14 -12 34 -6 42 C-2 48 6 44 10 40 Z" />
                <path className="jg-wing-r" d="M50 30 C68 14 72 34 66 42 C62 48 54 44 50 40 Z" />
            </g>
        );
    if (acc === 'devil')
        return (
            <g strokeLinecap="round" strokeLinejoin="round">
                <path d="M50 52 q14 4 10 -10" fill="none" stroke="#c43a3a" strokeWidth="3" />
                <path d="M57 41 l6 -4 -1 7 z" fill="#c43a3a" stroke={O} strokeWidth="1.5" />
                <path d="M2 64 V14" stroke="#7a3b16" strokeWidth="3" />
                <path d="M-5 16 V8 M2 16 V4 M9 16 V8 M-5 16 H9" fill="none" stroke="#6b6b7a" strokeWidth="3" />
            </g>
        );
    if (acc === 'astro')
        return (
            <g stroke={O} strokeWidth="2" strokeLinejoin="round">
                <rect x="50" y="22" width="12" height="30" rx="4" fill="#c7cde6" />
                <path className="jg-jet" d="M52 52 L56 64 L60 52 Z" fill="#ff9a3c" stroke="none" />
            </g>
        );
    if (acc === 'bunny')
        return (
            <g stroke={O} strokeWidth="2">
                <rect x="13" y="-12" width="10" height="30" rx="5" fill="#ffffff" />
                <rect x="37" y="-12" width="10" height="30" rx="5" fill="#ffffff" />
                <rect x="16" y="-8" width="4" height="20" rx="2" fill="#ffb8c9" stroke="none" />
                <rect x="40" y="-8" width="4" height="20" rx="2" fill="#ffb8c9" stroke="none" />
            </g>
        );
    if (acc === 'bear')
        return (
            <g fill="#b07a4b" stroke={O} strokeWidth="2">
                <circle cx="12" cy="15" r="7" />
                <circle cx="48" cy="15" r="7" />
            </g>
        );
    if (acc === 'cat')
        return (
            <g fill="#f0ae5e" stroke={O} strokeWidth="2" strokeLinejoin="round">
                <path d="M9 20 L13 2 L24 15 Z" />
                <path d="M51 20 L47 2 L36 15 Z" />
            </g>
        );
    return null;
}

/** accessories drawn on top of the body */
function Front({ acc }: { acc?: BuddySkin['acc'] }) {
    switch (acc) {
        case 'bow':
            return (
                <g stroke={O} strokeWidth="1.8" strokeLinejoin="round">
                    <path d="M8 10 L18 15 L8 20 Z" fill="#ff5f8a" />
                    <path d="M28 10 L18 15 L28 20 Z" fill="#ff5f8a" />
                    <circle cx="18" cy="15" r="3" fill="#ff8fab" />
                </g>
            );
        case 'sprout':
            return (
                <g stroke={O} strokeWidth="1.8">
                    <path d="M30 6 V-6" stroke="#4a8a2a" strokeWidth="2.5" fill="none" />
                    <ellipse cx="24" cy="-6" rx="6" ry="3.5" fill="#7cc84a" transform="rotate(-25 24 -6)" />
                    <ellipse cx="36" cy="-8" rx="6" ry="3.5" fill="#9ad85e" transform="rotate(25 36 -8)" />
                </g>
            );
        case 'flower':
            return (
                <g stroke={O} strokeWidth="1.5">
                    {[0, 72, 144, 216, 288].map((a) => (
                        <circle key={a} cx={15 + 5 * Math.cos((a * Math.PI) / 180)} cy={14 + 5 * Math.sin((a * Math.PI) / 180)} r="4" fill="#ffd1e8" />
                    ))}
                    <circle cx="15" cy="14" r="3" fill="#ffd34d" />
                </g>
            );
        case 'star':
            return <path d="M47 4 l2.5 5.2 5.7.8 -4.1 4 1 5.6 -5.1-2.7 -5.1 2.7 1-5.6 -4.1-4 5.7-.8z" fill="#ffd34d" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />;
        case 'frog':
            return (
                <g stroke={O} strokeWidth="2">
                    <circle cx="19" cy="14" r="7" fill="#9ee07e" />
                    <circle cx="41" cy="14" r="7" fill="#9ee07e" />
                    <circle cx="19" cy="13" r="3" fill={O} stroke="none" />
                    <circle cx="41" cy="13" r="3" fill={O} stroke="none" />
                </g>
            );
        case 'chef':
            return (
                <g stroke={O} strokeWidth="2" fill="#ffffff">
                    <rect x="16" y="6" width="28" height="9" rx="2" />
                    <circle cx="20" cy="0" r="7" />
                    <circle cx="30" cy="-4" r="8" />
                    <circle cx="40" cy="0" r="7" />
                    <rect x="17" y="2" width="26" height="6" stroke="none" />
                </g>
            );
        case 'headphones':
            return (
                <g stroke={O} strokeWidth="2">
                    <path d="M8 30 C8 4 52 4 52 30" fill="none" stroke="#ff5f8a" strokeWidth="4.5" />
                    <rect x="2" y="24" width="10" height="16" rx="4" fill="#ff5f8a" />
                    <rect x="48" y="24" width="10" height="16" rx="4" fill="#ff5f8a" />
                </g>
            );
        case 'wizard':
            return (
                <g stroke={O} strokeWidth="2" strokeLinejoin="round">
                    <ellipse cx="30" cy="14" rx="20" ry="4" fill="#6a4bc9" />
                    <path d="M18 13 L32 -16 L42 13 Z" fill="#7b5cd6" />
                    <path d="M31 -2 l1.5 3 3.3.5 -2.4 2.3 .6 3.3 -3-1.6 -3 1.6 .6-3.3 -2.4-2.3 3.3-.5z" fill="#ffd34d" strokeWidth="1" />
                </g>
            );
        case 'pirate':
            return (
                <g stroke={O} strokeWidth="2" strokeLinejoin="round">
                    <path d="M8 14 Q30 -8 52 14 Z" fill="#2b2b38" />
                    <circle cx="30" cy="7" r="2.5" fill="#ffffff" stroke="none" />
                    <path d="M14 26 L50 34" stroke={O} strokeWidth="1.5" />
                    <circle cx="40.5" cy="30" r="5" fill="#2b2b38" />
                </g>
            );
        case 'crown':
            return (
                <g stroke={O} strokeWidth="2" strokeLinejoin="round">
                    <path d="M14 16 L14 2 L22 9 L30 -2 L38 9 L46 2 L46 16 Z" fill="#ffcb2f" />
                    <circle cx="30" cy="10" r="2.5" fill="#ff5f8a" stroke="none" />
                    <circle cx="20" cy="12" r="2" fill="#5ec8ff" stroke="none" />
                    <circle cx="40" cy="12" r="2" fill="#5ec8ff" stroke="none" />
                </g>
            );
        case 'angel':
            return <ellipse cx="30" cy="-2" rx="13" ry="4" fill="none" stroke="#ffcb2f" strokeWidth="3.5" />;
        case 'devil':
            return (
                <g fill="#c43a3a" stroke={O} strokeWidth="2" strokeLinejoin="round">
                    <path d="M14 16 Q8 4 12 -2 Q16 8 22 14 Z" />
                    <path d="M46 16 Q52 4 48 -2 Q44 8 38 14 Z" />
                </g>
            );
        case 'astro':
            return (
                <g stroke={O} strokeWidth="2">
                    <rect x="3" y="9" width="54" height="52" rx="14" fill="none" stroke="#8fd3ff" strokeWidth="3" />
                    <path d="M30 9 V-4" stroke={O} strokeWidth="2" />
                    <circle cx="30" cy="-6" r="3.5" fill="#ff5f8a" />
                </g>
            );
        default:
            return null;
    }
}

const FX_PARTICLES: Record<NonNullable<BuddySkin['fx']>, string[]> = {
    steam: ['', '', ''],
    notes: ['♪', '♫', '♪'],
    sparkle: ['✦', '✧', '✦', '✧'],
    coins: ['🪙', '🪙', '🪙'],
    royal: ['✨', '✦', '✨', '✦'],
    holy: ['🪶', '✧', '🪶'],
    flame: ['🔥', '🔥', '🔥'],
    orbit: ['⭐', '✦', '🪐'],
    prism: ['●', '●', '●', '●', '●'],
};

/** Blocky puzzle-piece buddy in the flat style (+ ambient effect for epic / legendary skins) */
export function Buddy({ size = 64, mood = 'idle', skin }: { size?: number; mood?: 'idle' | 'happy'; skin?: BuddySkin }) {
    const s = skin ?? BUDDY_SKINS[0];
    const svg = <BuddySvg size={size} mood={mood} s={s} />;
    if (!s.fx) return svg;
    const legendary = s.grade === 'legendary';
    return (
        <span className={`jg-bfx fx-${s.fx} ${legendary ? 'legend' : ''}`} style={{ width: size, height: size, fontSize: size }}>
            {legendary && <i className="jg-bfx-aura" />}
            {svg}
            {FX_PARTICLES[s.fx].map((ch, i) => (
                <i key={i} className={`jg-bfx-p p${i}`}>
                    {ch}
                </i>
            ))}
        </span>
    );
}

function BuddySvg({ size, mood, s }: { size: number; mood: 'idle' | 'happy'; s: BuddySkin }) {
    const ink = s.ink ?? O;
    const cheek = s.cheek ?? '#ff8fa8';
    const top = s.rainbow ? 'url(#jgBuddyRainbow)' : s.top;
    return (
        <svg className={`jg-buddy ${s.rainbow ? 'rainbow' : ''}`} width={size} height={size} viewBox="-6 -18 72 82" aria-hidden style={{ overflow: 'visible' }}>
            {s.rainbow && (
                <defs>
                    <linearGradient id="jgBuddyRainbow" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#ffb3c7" />
                        <stop offset="0.35" stopColor="#ffe9a0" />
                        <stop offset="0.65" stopColor="#b8f0c9" />
                        <stop offset="1" stopColor="#b9d6ff" />
                    </linearGradient>
                </defs>
            )}
            <ellipse cx="30" cy="61" rx="20" ry="3.5" fill="rgba(0,0,0,0.14)" />
            <Back acc={s.acc} />
            {/* knobs */}
            <rect x="22" y="4" width="16" height="14" rx="5" fill={top} />
            <rect x="46" y="26" width="14" height="16" rx="5" fill={s.side} />
            {/* body: top face + front face */}
            <rect x="8" y="14" width="44" height="44" rx="7" fill={s.side} />
            <rect x="8" y="14" width="44" height="36" rx="7" fill={top} />
            {mood === 'happy' ? (
                <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round">
                    <path d="M17 31l3-3 3 3" />
                    <path d="M37 31l3-3 3 3" />
                </g>
            ) : (
                <g fill={ink} className="jg-buddy-eyes">
                    <rect x="17" y="27" width="5" height="6" rx="1.5" />
                    <rect x="38" y="27" width="5" height="6" rx="1.5" />
                </g>
            )}
            <rect x="27" y="35" width="6" height="3" rx="1.5" fill={ink} />
            <rect x="11" y="35" width="6" height="3.5" rx="1.75" fill={cheek} />
            <rect x="43" y="35" width="6" height="3.5" rx="1.75" fill={cheek} />
            <Front acc={s.acc} />
        </svg>
    );
}
