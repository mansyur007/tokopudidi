import { defineConfig, devices } from '@playwright/test';

// E2E Tokopudidi — hasilnya diunggah ke TestForge project `tkpdd`.
// Nama tiap test WAJIB memuat id `TC-TKPDD-<n>` supaya ter-map ke test case
// manual di TestForge (lihat e2e/helpers/testforge.ts).
//
// Target default = dev server lokal. JANGAN arahkan ke produksi: suite ini
// membuat akun, produk, dan pesanan sungguhan.
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Suite ini memakai data bersama (keranjang & pesanan milik 1 buyer seed),
  // jadi dijalankan serial supaya tidak saling menimpa.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // JUnit inilah yang dikirim ke TestForge oleh scripts/upload-junit.mjs.
  reporter: [['list'], ['junit', { outputFile: 'e2e-results/junit.xml' }]],

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
