import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Service-Base-Url', 'X-Atlassian-Token']
}));

// Domain whitelist — only these hosts may be proxied
const ALLOWED_DOMAINS = [
  'mocoapp.com',
  'atlassian.net',
  'atlassian.com',
  'jira.com',
  'api.personio.de'
];

function isAllowedUrl(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

function buildQueryString(query) {
  const params = new URLSearchParams(query).toString();
  return params ? `?${params}` : '';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', services: ['moco', 'jira', 'personio', 'outlook'] });
});

// Moco proxy
app.all('/moco/*', async (req, res) => {
  const domain = process.env.MOCO_DOMAIN;
  if (!domain) {
    return res.status(500).json({ error: 'MOCO_DOMAIN not configured' });
  }

  const path = req.path.replace('/moco', '');
  const qs = buildQueryString(req.query);
  const targetUrl = `https://${domain}.mocoapp.com/api/v1${path}${qs}`;

  if (!isAllowedUrl(targetUrl)) {
    return res.status(403).json({ error: 'Target host not allowed' });
  }

  console.log(`[Proxy] ${req.method} /moco${path} -> ${targetUrl}`);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  try {
    const fetchOptions = { method: req.method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();

    console.log(`[Proxy] Response: ${response.status}`);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(responseText);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
});

// Jira proxy
app.all('/jira/*', async (req, res) => {
  const baseUrl = req.headers['x-service-base-url'] || process.env.JIRA_BASE_URL;
  if (!baseUrl) {
    return res.status(500).json({ error: 'Jira base URL not configured' });
  }

  if (!isAllowedUrl(baseUrl)) {
    console.warn(`[Proxy] Blocked Jira request to disallowed host: ${baseUrl}`);
    return res.status(403).json({ error: 'Target host not allowed' });
  }

  const path = req.path.replace('/jira', '');
  const qs = buildQueryString(req.query);
  const targetUrl = `${baseUrl}${path}${qs}`;

  console.log(`[Proxy] ${req.method} /jira${path} -> ${targetUrl}`);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Atlassian-Token': 'no-check'
  };

  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  try {
    const fetchOptions = { method: req.method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(responseText);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
});

// Personio proxy
app.all('/personio/*', async (req, res) => {
  const path = req.path.replace('/personio', '');
  const qs = buildQueryString(req.query);
  const targetUrl = `https://api.personio.de${path}${qs}`;

  console.log(`[Proxy] ${req.method} /personio${path} -> ${targetUrl}`);

  const contentType = req.headers['content-type'] || 'application/json';
  const headers = {
    'Content-Type': contentType,
    'Accept': 'application/json'
  };

  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  try {
    const fetchOptions = { method: req.method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      if (contentType.includes('x-www-form-urlencoded')) {
        fetchOptions.body = new URLSearchParams(req.body).toString();
      } else {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();

    console.log(`[Proxy] Response: ${response.status}`);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(responseText);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
  Roots CORS Proxy
  Listening: http://localhost:${PORT}
  Routes:    /moco/*  /jira/*  /personio/*
  `);
});
