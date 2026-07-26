import { test, expect } from '@playwright/test';
import { tc, API_URL } from './helpers/testforge';

test(tc('121', 'Health check merespons OK'), async ({ request }) => {
  // Manual case: GET /api/health -> 200 dengan status sehat (api + database).
  const res = await request.get(`${API_URL}/api/health`);

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.api).toBe('ok');
  expect(body.data.database).toBe('ok');
});
