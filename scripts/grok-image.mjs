#!/usr/bin/env node
/**
 * Grok (xAI) image generation helper.
 *
 *   node scripts/grok-image.mjs --prompt "..." --out generated-images/x.png [--ref path/to/style.png] [--ar 1:1] [--res 2k] [--quality medium]
 *
 * Needs the XAI_API_KEY environment variable (https://console.x.ai). The key is never printed.
 * With --ref the image is sent to /v1/images/edits as the source image (used as a style reference);
 * without it a plain text-to-image request goes to /v1/images/generations.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1]]);
        return acc;
    }, []),
);

const key = process.env.XAI_API_KEY;
if (!key) {
    console.error('XAI_API_KEY is not set. Create a key at https://console.x.ai and set it as an environment variable.');
    process.exit(2);
}
if (!args.prompt || !args.out) {
    console.error('usage: --prompt "..." --out file.png [--ref style.png] [--ar 1:1] [--res 1k|2k] [--quality low|medium|auto]');
    process.exit(2);
}

const model = args.model || 'grok-imagine-image-2.0';
const body = {
    model,
    prompt: args.prompt,
    n: 1,
    aspect_ratio: args.ar || '1:1',
    resolution: args.res || '2k',
    response_format: 'b64_json',
};
if (args.quality) body.quality = args.quality;

let endpoint = 'https://api.x.ai/v1/images/generations';
if (args.ref) {
    const buf = await readFile(args.ref);
    const mime = extname(args.ref).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    body.image = { type: 'image_url', url: `data:${mime};base64,${buf.toString('base64')}` };
    endpoint = 'https://api.x.ai/v1/images/edits';
}

const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
    console.error(`HTTP ${res.status}: ${text.slice(0, 800)}`);
    process.exit(1);
}
const json = JSON.parse(text);
const item = json.data?.[0];
let bytes;
if (item?.b64_json) bytes = Buffer.from(item.b64_json, 'base64');
else if (item?.url) bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer());
else {
    console.error('Unexpected response:', text.slice(0, 800));
    process.exit(1);
}
await mkdir(dirname(args.out), { recursive: true });
await writeFile(args.out, bytes);
console.log(`saved ${args.out} (${bytes.length} bytes) via ${endpoint.split('/').pop()} ${model}`);
