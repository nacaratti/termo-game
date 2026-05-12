// Gera public/sitemap.xml e public/robots.txt com a URL base do projeto.
// Chamado automaticamente pelo build (via package.json prebuild).
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Lê VITE_PUBLIC_URL do processo (já carregado pelo shell) ou do .env local
function getBaseUrl() {
  if (process.env.VITE_PUBLIC_URL) return process.env.VITE_PUBLIC_URL.replace(/\/$/, '');
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf-8');
    const match = env.match(/^VITE_PUBLIC_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/\/$/, '');
  } catch {}
  return 'https://example.com'; // fallback
}

const BASE = getBaseUrl();
const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE}/6</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE}/changelog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml
`;

writeFileSync(resolve(ROOT, 'public/sitemap.xml'), sitemap);
writeFileSync(resolve(ROOT, 'public/robots.txt'), robots);
console.log(`✓ sitemap.xml e robots.txt gerados para ${BASE}`);
