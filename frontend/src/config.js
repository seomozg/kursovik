// Frontend configuration
// Use relative URLs when nginx proxies to backend (production)
// For local development (localhost), use direct backend URL
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
export const BACKEND_URL = isLocalhost ? 'http://localhost:8082' : '';
export const FRONTEND_PORT = 3000;
export const OUTLINE_POLLING_INTERVAL_MS = 200; // Frontend polling interval for outlines (200ms)
export const ARTICLE_GENERATION_TIMEOUT_MS = 300000; // 5 minutes
export const OUTLINE_GENERATION_TIMEOUT_MS = 30000; // 30 seconds
export const HINT_GENERATION_TIMEOUT_MS = 30000; // 30 seconds for hints
