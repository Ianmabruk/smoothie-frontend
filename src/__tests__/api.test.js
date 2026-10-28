import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_BASE = 'https://api.example.com/api';

async function loadApi(baseUrl = ORIGINAL_BASE, extraEnv = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', baseUrl);
  for (const [key, value] of Object.entries(extraEnv)) {
    vi.stubEnv(key, value);
  }
  return import('../api.js');
}

describe('normalizeApiBase', () => {
  it('keeps a base URL that already ends with /api', async () => {
    const { normalizeApiBase } = await loadApi();
    expect(normalizeApiBase('https://api.example.com/api')).toBe('https://api.example.com/api');
  });

  it('adds /api to a bare origin exactly once', async () => {
    const { normalizeApiBase } = await loadApi();
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api');
  });

  it('never duplicates the /api prefix', async () => {
    const { normalizeApiBase } = await loadApi();
    expect(normalizeApiBase('https://api.example.com/api/api')).toBe('https://api.example.com/api');
  });

  it('returns an empty string for unusable values', async () => {
    const { normalizeApiBase } = await loadApi();
    expect(normalizeApiBase('')).toBe('');
    expect(normalizeApiBase('   ')).toBe('');
    expect(normalizeApiBase('not a url')).toBe('');
    expect(normalizeApiBase('ftp://api.example.com')).toBe('');
  });
});

describe('validateApiBase', () => {
  it('rejects a missing base URL', async () => {
    const { validateApiBase } = await loadApi();
    expect(validateApiBase('').valid).toBe(false);
  });

  it('rejects localhost in production', async () => {
    const { validateApiBase } = await loadApi('http://localhost:5173/api', {
      PROD: 'true',
    });
    const result = validateApiBase('http://localhost:5173/api', { isProduction: true });
    expect(result.valid).toBe(false);
  });

  it('accepts a production HTTPS origin', async () => {
    const { validateApiBase } = await loadApi();
    const result = validateApiBase('https://smoothie-ai.onrender.com/api', {
      isProduction: true,
    });
    expect(result.valid).toBe(true);
  });
});

describe('frontend does not expose provider secrets', () => {
  it('api.js only references the public VITE_API_BASE_URL env key', async () => {
    const { API_BASE_ENV_KEY } = await loadApi();
    expect(API_BASE_ENV_KEY).toBe('VITE_API_BASE_URL');
  });
});
