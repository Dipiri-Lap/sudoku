// 개발 서버 전용: 노노그램 편집 모드에서 저장하면 levels.ts 의 해당 레벨 art 를 직접 고쳐 쓴다.
//   POST /__nonogram/save  { id: string, art: string[] }
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export default function nonogramSave(): Plugin {
  return {
    name: 'nonogram-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__nonogram/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c: Buffer) => { body += c; });
        req.on('end', () => {
          try {
            const { id, art } = JSON.parse(body) as { id: string; art: string[] };
            if (!/^[a-z0-9]+$/i.test(id) || !Array.isArray(art) || !art.every(r => typeof r === 'string')) throw new Error('bad payload');
            const file = path.resolve(server.config.root, 'src/features/nonogram/data/levels.ts');
            const src = fs.readFileSync(file, 'utf-8');
            const i = src.indexOf(`id: '${id}'`);
            if (i < 0) throw new Error(`level not found: ${id}`);
            const a = src.indexOf('    art: [', i);
            const b = src.indexOf('    ],', a);
            if (a < 0 || b < 0) throw new Error('art block not found');
            const nl = src.includes('\r\n') ? '\r\n' : '\n'; // 파일의 줄바꿈 방식 유지
            const block = '    art: [' + nl + art.map(r => `      '${r}',`).join(nl) + nl;
            fs.writeFileSync(file, src.slice(0, a) + block + src.slice(b), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
          }
        });
      });
    },
  };
}
