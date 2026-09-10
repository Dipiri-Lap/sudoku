/**
 * sitemap.xml 생성 — scripts/seo-routes.mjs 의 라우트 목록을 그대로 따른다.
 *
 * public/sitemap.xml 과 dist/sitemap.xml 을 함께 쓴다.
 * public 쪽은 저장소에서 확인할 수 있게, dist 쪽은 빌드 산출물을 덮어쓰기 위해서다.
 */

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { routes, BASE_URL } from './seo-routes.mjs';

const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' },
  ...routes.map(r => ({
    loc: r.canonical,
    changefreq: r.changefreq ?? 'monthly',
    priority: r.priority ?? '0.8',
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

for (const dir of ['public', 'dist']) {
  if (!existsSync(dir)) continue;
  const out = join(dir, 'sitemap.xml');
  writeFileSync(out, xml, 'utf-8');
  console.log(`✅ Generated: ${out} (${urls.length} URLs)`);
}
