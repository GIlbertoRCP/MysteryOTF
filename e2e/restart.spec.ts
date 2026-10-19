import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';

// Needs a Redis to save cases into. CI provides one; locally run e.g.
//   docker run -d -p 6390:6379 redis:7-alpine
//   TEST_REDIS_URL=redis://localhost:6390 npx playwright test restart
const REDIS_URL = process.env.TEST_REDIS_URL;
const PORT = 4310;
const BASE = `http://localhost:${PORT}`;

test.skip(!REDIS_URL, 'set TEST_REDIS_URL to run the restart test');

let server: ChildProcess | null = null;

async function startServer() {
  server = spawn('node', ['server/dist/index.js'], { env: { ...process.env, PORT: String(PORT), REDIS_URL }, stdio: 'inherit' });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok && (await res.json()).durable) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

function stopServer() {
  server?.kill('SIGKILL');
  server = null;
}

test.afterAll(stopServer);

const cardCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { Konva: { stages: { find: (s: string) => unknown[] }[] } }).Konva.stages[0].find('Group').length);

test('a case survives the server restarting mid-game', async ({ browser }) => {
  await startServer();
  const gilCtx = await browser.newContext();
  const anaCtx = await browser.newContext();
  for (const ctx of [gilCtx, anaCtx]) await ctx.addInitScript(() => localStorage.setItem('dbs-weather', 'off'));
  const gil = await gilCtx.newPage();
  const ana = await anaCtx.newPage();

  await gil.goto(BASE);
  await gil.locator('#name').fill('Gil');
  await gil.getByRole('button', { name: 'Open the case' }).click();
  await expect(gil).toHaveURL(/room=/);
  const code = new URL(gil.url()).searchParams.get('room')!;

  await ana.goto(`${BASE}/?room=${code}`);
  await ana.locator('#name').fill('Ana');
  await ana.getByRole('button', { name: 'Join case' }).click();
  await expect(gil.getByText('Ana joined the case')).toBeVisible();

  for (let i = 0; i < 3; i++) await gil.getByRole('button', { name: 'Pin', exact: true }).first().click();
  await expect.poll(() => cardCount(ana)).toBeGreaterThan(0);
  const before = await cardCount(gil);
  await new Promise(r => setTimeout(r, 1000)); // let the save land

  stopServer();
  await expect(gil.getByText('Connection lost. Reconnecting…')).toBeVisible();

  await startServer();
  await expect(gil.getByText('Connection lost. Reconnecting…')).toBeHidden({ timeout: 20_000 });
  await expect(gil).toHaveURL(new RegExp(`room=${code}`));
  await expect(ana).toHaveURL(new RegExp(`room=${code}`));
  await expect.poll(() => cardCount(gil)).toBe(before);
  await expect.poll(() => cardCount(ana)).toBe(before);
  await expect(gil.locator('header').getByText('Ana', { exact: true })).toHaveCount(1);
});
