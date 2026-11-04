/**
 * Stage-clear share card: draws a 1080×1350 picture (same look as the in-game clear screen)
 * on a canvas and shares it through the Web Share API, falling back to a download + copied text.
 */

export interface ShareCardInput {
    image: string;
    title: string;
    stageId: number;
    stars: number;
    moves: number;
    tint: string;
    /** masterpiece stage → gold card + label */
    masterpiece?: boolean;
    /** the buddy <svg> currently on the clear screen (drawn into the card) */
    buddySvg?: SVGElement | null;
}

export type ShareResult = 'shared' | 'saved' | 'cancelled';

const GRADE = ['GOOD', 'GOOD', 'GREAT', 'PERFECT'];
const GRADE_BG = ['#4aa3e8', '#4aa3e8', '#ffb020', '#ff5f8a'];
const W = 1080;
const H = 1350;
const STAR_PATH = 'M24 2l6.5 13.4 14.7 2.1-10.6 10.4 2.5 14.6L24 35.6l-13.1 6.9 2.5-14.6L2.8 17.5l14.7-2.1z';

function shade(hex: string, f: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, Math.max(0, v * f))));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = src;
    });
}

async function loadBuddy(el?: SVGElement | null): Promise<HTMLImageElement | null> {
    if (!el) return null;
    try {
        const clone = el.cloneNode(true) as SVGElement;
        clone.setAttribute('width', '440');
        clone.setAttribute('height', '440');
        // wider box so hats, wings and ears are not clipped
        clone.setAttribute('viewBox', '-20 -26 100 100');
        clone.removeAttribute('class');
        const xml = new XMLSerializer().serializeToString(clone);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
        try {
            return await loadImage(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch {
        return null;
    }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, on: boolean) {
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 48, size / 48);
    ctx.fillStyle = on ? '#ffcb2f' : 'rgba(0,0,0,0.16)';
    ctx.fill(new Path2D(STAR_PATH));
    ctx.translate(24, 25);
    ctx.scale(0.5, 0.5);
    ctx.translate(-24, -24);
    ctx.fillStyle = on ? '#f2901d' : 'rgba(0,0,0,0.1)';
    ctx.fill(new Path2D(STAR_PATH));
    ctx.restore();
}

function text(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    font: string,
    color: string,
    shadow?: { dy: number; color: string },
) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (shadow) {
        ctx.fillStyle = shadow.color;
        ctx.fillText(str, x, y + shadow.dy);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
}

export async function buildShareCard(input: ShareCardInput): Promise<Blob> {
    const deep = shade(input.tint, 0.55);
    const scoreLine = `${input.moves}번 만에 완성`;
    await Promise.all([
        document.fonts.load('170px "Lilita One"', 'CLEAR!STAGE 0123456789Tiny Pieces'),
        document.fonts.load('62px "Black Han Sans"', `${input.title}${scoreLine}너는 몇 번 만에 맞출 수 있어?명화 컬렉션`),
    ]).catch(() => undefined);
    const [pic, buddy] = await Promise.all([loadImage(input.image), loadBuddy(input.buddySvg)]);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');

    // flat background + dot pattern + soft corner circles
    ctx.fillStyle = input.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let y = 0, row = 0; y < H + 90; y += 90, row++) {
        for (let x = row % 2 ? 45 : 0; x < W + 90; x += 90) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(60, 1290, 260, 0, Math.PI * 2);
    ctx.arc(1030, 90, 230, 0, Math.PI * 2);
    ctx.fill();

    // sunburst behind the card
    ctx.save();
    ctx.translate(W / 2, 760);
    const ray = ctx.createRadialGradient(0, 0, 60, 0, 0, 760);
    ray.addColorStop(0, 'rgba(255,255,255,0.22)');
    ray.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = ray;
    for (let i = 0; i < 20; i++) {
        const a0 = (i * Math.PI * 2) / 20;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 900, a0, a0 + Math.PI / 20);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // STAGE pill
    const pill = `STAGE ${String(input.stageId).padStart(2, '0')}`;
    ctx.font = '38px "Lilita One"';
    const pw = ctx.measureText(pill).width + 80;
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    roundRect(ctx, W / 2 - pw / 2, 62 + 6, pw, 64, 32);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, W / 2 - pw / 2, 62, pw, 64, 32);
    ctx.fill();
    text(ctx, pill, W / 2, 108, '38px "Lilita One"', deep);

    // CLEAR!
    ctx.save();
    ctx.translate(W / 2, 268);
    ctx.rotate(-0.07);
    text(ctx, 'CLEAR!', 0, 0, '170px "Lilita One"', '#ffffff', { dy: 12, color: 'rgba(0,0,0,0.2)' });
    ctx.restore();

    // polaroid card (slightly tilted)
    const cardX = 190;
    const cardY = 350;
    const cardW = 700;
    const cardH = 810;
    ctx.save();
    ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
    ctx.rotate(-0.02);
    ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(ctx, cardX, cardY + 18, cardW, cardH, 56);
    ctx.fill();
    if (input.masterpiece) {
        const gold = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        gold.addColorStop(0, '#ffe58a');
        gold.addColorStop(0.4, '#f2b52a');
        gold.addColorStop(0.6, '#ffe9a0');
        gold.addColorStop(1, '#d99512');
        ctx.fillStyle = gold;
    } else ctx.fillStyle = '#ffffff';
    roundRect(ctx, cardX, cardY, cardW, cardH, 56);
    ctx.fill();

    // picture
    const picSize = 560;
    const picX = cardX + (cardW - picSize) / 2;
    const picY = cardY + 75;
    if (input.masterpiece) {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, picX - 12, picY - 12, picSize + 24, picSize + 24, 44);
        ctx.fill();
    }
    ctx.save();
    roundRect(ctx, picX, picY, picSize, picSize, 36);
    ctx.clip();
    ctx.drawImage(pic, picX, picY, picSize, picSize);
    ctx.restore();

    // title + score
    const ink = input.masterpiece ? '#5a3a00' : '#3a3046';
    text(ctx, input.title, cardX + cardW / 2, picY + picSize + 78, '62px "Black Han Sans"', ink);
    text(ctx, scoreLine, cardX + cardW / 2, picY + picSize + 138, '40px "Black Han Sans"', input.masterpiece ? '#7a5200' : deep);

    // masterpiece label (top-left of the card)
    if (input.masterpiece) {
        ctx.save();
        ctx.translate(cardX + 40, cardY + 70);
        ctx.rotate(-0.17);
        ctx.font = '34px "Black Han Sans"';
        const lw = ctx.measureText('명화 컬렉션').width + 44;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        roundRect(ctx, -lw / 2, -30 + 7, lw, 60, 18);
        ctx.fill();
        ctx.fillStyle = '#3a3046';
        roundRect(ctx, -lw / 2, -30, lw, 60, 18);
        ctx.fill();
        text(ctx, '명화 컬렉션', 0, 12, '34px "Black Han Sans"', '#ffd34d');
        ctx.restore();
    }

    // grade stamp (top-right of the card)
    {
        const label = GRADE[input.stars] ?? 'GOOD';
        ctx.save();
        ctx.translate(cardX + cardW - 20, cardY + 90);
        ctx.rotate(0.24);
        ctx.font = '58px "Lilita One"';
        const sw = ctx.measureText(label).width + 56;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        roundRect(ctx, -sw / 2, -40 + 10, sw, 84, 24);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, -sw / 2 - 7, -40 - 7, sw + 14, 98, 28);
        ctx.fill();
        ctx.fillStyle = GRADE_BG[input.stars] ?? '#4aa3e8';
        roundRect(ctx, -sw / 2, -40, sw, 84, 24);
        ctx.fill();
        text(ctx, label, 0, 20, '58px "Lilita One"', '#ffffff');
        ctx.restore();
    }

    // stars overlapping the card's top edge
    const sizes = [100, 130, 100];
    const xs = [cardX + cardW / 2 - 130, cardX + cardW / 2, cardX + cardW / 2 + 130];
    const tilt = [-0.21, 0, 0.21];
    for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.translate(xs[k], cardY + (k === 1 ? -4 : 8));
        ctx.rotate(tilt[k]);
        drawStar(ctx, 0, 0, sizes[k], input.stars > k);
        ctx.restore();
    }

    // buddy sitting on the picture's bottom-right corner
    if (buddy) ctx.drawImage(buddy, picX + picSize - 170, picY + picSize - 190, 270, 270);
    ctx.restore();

    // challenge line + brand
    text(ctx, '너는 몇 번 만에 맞출 수 있어?', W / 2, 1236, '44px "Black Han Sans"', '#ffffff', { dy: 4, color: 'rgba(0,0,0,0.18)' });
    text(ctx, 'Tiny Pieces', W / 2, 1310, '64px "Lilita One"', '#ffffff', { dy: 6, color: 'rgba(0,0,0,0.2)' });

    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    );
}

export function shareText(input: ShareCardInput): string {
    const stars = '★'.repeat(input.stars) + '☆'.repeat(Math.max(0, 3 - input.stars));
    const grade = GRADE[input.stars] ?? 'GOOD';
    return `🧩 Tiny Pieces ${input.stageId}번 '${input.title}' ${stars} ${grade}!\n나는 ${input.moves}번 만에 맞췄어. 너는 몇 번 만에 맞출 수 있어?\n👉 ${window.location.origin}/jigsaw`;
}

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function saveClearCard(input: ShareCardInput): Promise<void> {
    download(await buildShareCard(input), `tiny-pieces-${input.stageId}.png`);
}

/** Share the card image + text. Falls back to saving the image and copying the text. */
export async function shareClear(input: ShareCardInput): Promise<ShareResult> {
    const blob = await buildShareCard(input);
    const file = new File([blob], `tiny-pieces-${input.stageId}.png`, { type: 'image/png' });
    const caption = shareText(input);
    try {
        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Tiny Pieces', text: caption });
            return 'shared';
        }
        if (navigator.share) {
            await navigator.share({ title: 'Tiny Pieces', text: caption });
            return 'shared';
        }
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
    download(blob, `tiny-pieces-${input.stageId}.png`);
    try {
        await navigator.clipboard.writeText(caption);
    } catch {
        /* clipboard unavailable */
    }
    return 'saved';
}
