// ============================================================
// Pull-analytics — sensor determinístico (sem LLM).
// Coleta métricas do dia anterior:
//   - GA4 Data API: sessions, active_users, pageviews, new_users,
//     avg_engagement (segundos)
//   - PageSpeed Insights: LCP, INP, CLS (mobile, p75 ou Lighthouse lab)
// Grava em product_metrics (upsert por metric_date) e gera
// reports/metrics-latest.json que o CEO Agent lê.
//
// Degrada graciosamente: se GA4 não estiver configurado, pula só
// essa parte. Se PSI falhar, segue com GA4. Se ambos faltarem,
// grava uma linha quase-vazia para o CEO saber que tentou.
//
// Uso manual: node scripts/pull-analytics.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { createSign } from 'crypto';
import { join } from 'path';

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const GA4_SA_KEY = process.env.GA4_SA_KEY; // caminho do JSON OU JSON inline
const PSI_API_KEY = process.env.PSI_API_KEY; // opcional
const SITE_URL = (process.env.SITE_URL || 'https://kinto.fun').replace(/\/$/, '');

if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

// ─── Helpers de data ─────────────────────────────────────────

function ymd(d) { return d.toISOString().slice(0, 10); }
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return ymd(d);
}
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return ymd(d);
}

// ─── GA4: auth via service account (JWT cru, sem dependência) ─

function loadServiceAccount() {
  if (!GA4_SA_KEY) return null;
  try {
    // Pode ser o JSON inline OU um caminho de arquivo
    if (GA4_SA_KEY.trim().startsWith('{')) {
      return JSON.parse(GA4_SA_KEY);
    }
    return JSON.parse(readFileSync(GA4_SA_KEY, 'utf8'));
  } catch (err) {
    console.warn('[ga4] Falha ao ler service account:', err.message);
    return null;
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getGoogleAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const jwt = unsigned + '.' + base64url(signature);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Sem access_token: ' + JSON.stringify(data));
  return data.access_token;
}

async function fetchGA4(dateStr) {
  if (!GA4_PROPERTY_ID) {
    console.log('[ga4] GA4_PROPERTY_ID ausente — pulando');
    return null;
  }
  const sa = loadServiceAccount();
  if (!sa) {
    console.log('[ga4] Service account ausente — pulando');
    return null;
  }

  try {
    const token = await getGoogleAccessToken(sa);
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: dateStr, endDate: dateStr }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'newUsers' },
            { name: 'averageSessionDuration' },
          ],
        }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const row = data.rows?.[0]?.metricValues ?? [];
    return {
      sessions: parseInt(row[0]?.value ?? 0) || 0,
      active_users: parseInt(row[1]?.value ?? 0) || 0,
      pageviews: parseInt(row[2]?.value ?? 0) || 0,
      new_users: parseInt(row[3]?.value ?? 0) || 0,
      avg_engagement: parseFloat(row[4]?.value ?? 0) || 0,
    };
  } catch (err) {
    console.warn('[ga4] Falhou:', err.message);
    return null;
  }
}

// ─── PageSpeed Insights ──────────────────────────────────────

async function fetchPSI() {
  const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  url.searchParams.set('url', SITE_URL);
  url.searchParams.set('strategy', 'mobile');
  url.searchParams.set('category', 'performance');
  if (PSI_API_KEY) url.searchParams.set('key', PSI_API_KEY);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    // Prioriza dados de campo (CrUX p75) se disponível; senão usa lab (Lighthouse)
    const fld = data.loadingExperience?.metrics;
    const lab = data.lighthouseResult?.audits;

    const lcp = fld?.LARGEST_CONTENTFUL_PAINT_MS?.percentile
      ?? lab?.['largest-contentful-paint']?.numericValue;
    const inp = fld?.INTERACTION_TO_NEXT_PAINT?.percentile
      ?? lab?.['interaction-to-next-paint']?.numericValue;
    const cls = fld?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
      ? fld.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100  // CrUX vem ×100
      : lab?.['cumulative-layout-shift']?.numericValue;

    return {
      lcp_ms: lcp != null ? Math.round(lcp) : null,
      inp_ms: inp != null ? Math.round(inp) : null,
      cls: cls != null ? Number(cls.toFixed(3)) : null,
    };
  } catch (err) {
    console.warn('[psi] Falhou:', err.message);
    return null;
  }
}

// ─── Agregação semanal para o CEO ────────────────────────────

async function buildWeeklySummary() {
  const since = daysAgo(7);
  const { data, error } = await supabase
    .from('product_metrics')
    .select('*')
    .gte('metric_date', since)
    .order('metric_date', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const sumOrNull = (key) => {
    const vs = rows.map(r => r[key]).filter(v => v != null);
    return vs.length ? vs.reduce((a, b) => a + Number(b), 0) : null;
  };
  const avgOrNull = (key) => {
    const vs = rows.map(r => r[key]).filter(v => v != null);
    return vs.length ? Number((vs.reduce((a, b) => a + Number(b), 0) / vs.length).toFixed(2)) : null;
  };

  return {
    generated_at: new Date().toISOString(),
    window_days: 7,
    daily_rows: rows.map(r => ({
      date: r.metric_date,
      sessions: r.sessions,
      active_users: r.active_users,
      pageviews: r.pageviews,
      new_users: r.new_users,
      lcp_ms: r.lcp_ms,
      inp_ms: r.inp_ms,
      cls: r.cls,
    })),
    totals: {
      sessions: sumOrNull('sessions'),
      active_users: sumOrNull('active_users'),
      pageviews: sumOrNull('pageviews'),
      new_users: sumOrNull('new_users'),
    },
    averages: {
      lcp_ms: avgOrNull('lcp_ms'),
      inp_ms: avgOrNull('inp_ms'),
      cls: avgOrNull('cls'),
      avg_engagement: avgOrNull('avg_engagement'),
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const date = yesterday();
  console.log(`[pull-analytics] Coletando para ${date}…`);

  const [ga4, psi] = await Promise.all([fetchGA4(date), fetchPSI()]);

  const sourceParts = [];
  if (ga4) sourceParts.push('ga4');
  if (psi) sourceParts.push('psi');
  const source = sourceParts.join('+') || 'none';

  const row = {
    metric_date: date,
    source,
    ...(ga4 || {}),
    ...(psi || {}),
  };

  const { error } = await supabase
    .from('product_metrics')
    .upsert(row, { onConflict: 'metric_date' });

  if (error) {
    console.error('[pull-analytics] Falha ao upsert:', error.message);
    process.exit(1);
  }

  console.log('[pull-analytics] Linha gravada:', row);

  // Gera reports/metrics-latest.json para o CEO Agent ler
  try {
    const summary = await buildWeeklySummary();
    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
    writeFileSync(
      join(reportsDir, 'metrics-latest.json'),
      JSON.stringify(summary, null, 2),
      'utf8'
    );
    console.log('[pull-analytics] reports/metrics-latest.json atualizado');
  } catch (err) {
    console.warn('[pull-analytics] Falha ao gerar summary:', err.message);
  }
}

main().catch(err => {
  console.error('[pull-analytics] Erro inesperado:', err.message);
  process.exit(1);
});
