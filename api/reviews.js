const MAX_REQUEST_BYTES = 10000;
const MAX_NAME_LENGTH = 80;
const MIN_REVIEW_LENGTH = 20;
const MAX_REVIEW_LENGTH = 1200;
const MAX_PUBLIC_REVIEWS = 24;

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(payload);
}

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) return null;

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'https:') return null;
    return { baseUrl: parsed.origin, serviceKey };
  } catch {
    return null;
  }
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = async function reviews(req, res) {
  res.setHeader('Allow', 'GET, POST');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const config = getSupabaseConfig();
  if (!config) return sendJson(res, 503, { error: 'Reviews are not available yet.' });

  const endpoint = config.baseUrl + '/rest/v1/reviews';
  const headers = { apikey: config.serviceKey, Authorization: 'Bearer ' + config.serviceKey, Accept: 'application/json' };
  try {
    if (req.method === 'GET') {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        select: 'id,name,rating,body,created_at',
        status: 'eq.approved',
        order: 'created_at.desc',
        limit: String(MAX_PUBLIC_REVIEWS)
      }).toString();
      const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) return sendJson(res, 502, { error: 'Reviews are temporarily unavailable.' });
      const reviews = await upstream.json();
      if (!Array.isArray(reviews)) return sendJson(res, 502, { error: 'Reviews are temporarily unavailable.' });
      return sendJson(res, 200, { reviews });
    }

    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_REQUEST_BYTES) return sendJson(res, 413, { error: 'The review is too large.' });
    const body = parseRequestBody(req);
    if (!body) return sendJson(res, 400, { error: 'Send the review as a JSON object.' });
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) return sendJson(res, 413, { error: 'The review is too large.' });
    if (typeof body.website === 'string' && body.website.trim()) return sendJson(res, 200, { ok: true });

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const reviewText = typeof body.body === 'string' ? body.body.trim() : '';
    const rating = body.rating;
    if (name.length < 1 || name.length > MAX_NAME_LENGTH) return sendJson(res, 400, { error: 'Enter a name up to 80 characters.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendJson(res, 400, { error: 'Choose a rating from 1 to 5 stars.' });
    if (reviewText.length < MIN_REVIEW_LENGTH || reviewText.length > MAX_REVIEW_LENGTH) return sendJson(res, 400, { error: 'Write between 20 and 1,200 characters.' });

    const upstream = await fetch(endpoint + '?select=id', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name, rating, body: reviewText, status: 'pending' }),
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return sendJson(res, 502, { error: 'Your review could not be saved. Please try again.' });
    return sendJson(res, 201, { ok: true });
  } catch {
    return sendJson(res, 502, { error: 'Reviews are temporarily unavailable. Please try again.' });
  }
};
