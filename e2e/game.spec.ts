import { test, expect, Page, Browser } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The engine is deterministic, so the tests can work out the answer to a seeded case
// from the built server code instead of hard-coding it.
async function solutionFor(difficulty: string, theme: string, seed: string) {
  const engine = await import(pathToFileURL(path.resolve('server/dist/mysteryEngine.js')).href);
  const bp = engine.buildBlueprint(difficulty, theme, seed);
  const m = engine.localize(bp, 'en');
  const s = bp.solution;
  return {
    killer: m.suspects.find((x: { id: string }) => x.id === s.killerId).name as string,
    motive: m.options.motives.find((x: { id: string }) => x.id === s.motiveId).label as string,
    weapon: m.options.weapons.find((x: { id: string }) => x.id === s.weaponId).label as string,
    alibi: m.evidence.find((x: { id: string }) => x.id === s.alibiEvidenceId).title as string,
  };
}

async function newPlayer(browser: Browser, lang: 'en' | 'es') {
  // A separate context per player, like two different people's browsers.
  const context = await browser.newContext();
  await context.addInitScript((l) => {
    localStorage.setItem('dbs-lang', l);
    localStorage.setItem('dbs-sound', 'off');
    localStorage.setItem('dbs-weather', 'off');
  }, lang);
  return context.newPage();
}

const boardCardCount = (page: Page) =>
  page.evaluate(() => {
    const stage = (window as unknown as { Konva?: { stages: { find: (s: string) => unknown[] }[] } }).Konva?.stages[0];
    return stage ? stage.find('Group').length : -1;
  });

async function createCase(page: Page, opts: { name: string; seed?: string; solo?: boolean; difficulty?: string }) {
  await page.goto('/');
  await page.locator('#name').fill(opts.name);
  if (opts.solo) await page.getByRole('radio', { name: 'Solo' }).click();
  if (opts.difficulty) await page.getByRole('radio', { name: opts.difficulty }).click();
  if (opts.seed) {
    await page.getByRole('button', { name: 'More options' }).click();
    await page.locator('#seed').fill(opts.seed);
  }
  await page.getByRole('button', { name: 'Open the case' }).click();
  await expect(page).toHaveURL(/room=[A-Z0-9]{5}/);
  await expect(page.locator('canvas').first()).toBeVisible();
  return new URL(page.url()).searchParams.get('room')!;
}

test('two players in two languages solve a case together', async ({ browser }) => {
  const seed = 'E2E-DUO-1';
  const answer = await solutionFor('Detective', 'gothic', seed);

  const gil = await newPlayer(browser, 'en');
  const code = await createCase(gil, { name: 'Gil', seed });
  await expect(gil.getByText('Your partner hasn’t joined yet')).toBeVisible();

  const ana = await newPlayer(browser, 'es');
  await ana.goto(`/?room=${code}`);
  await expect(ana.getByText(`Te invitaron al caso ${code}`)).toBeVisible();
  await ana.locator('#name').fill('Ana');
  await ana.getByRole('button', { name: 'Unirse', exact: true }).click();
  await expect(ana.getByText('Analista Forense')).toBeVisible();

  // Gil sees Ana arrive, and the waiting banner goes away.
  await expect(gil.getByText('Ana joined the case')).toBeVisible();
  await expect(gil.getByText('Your partner hasn’t joined yet')).toBeHidden();

  // A card pinned by one player appears on the other's board.
  const before = await boardCardCount(ana);
  await gil.getByRole('button', { name: 'Pin', exact: true }).first().click();
  await expect.poll(() => boardCardCount(ana)).toBeGreaterThan(before);

  // Quick phrases arrive translated.
  await gil.getByRole('button', { name: 'Radio', exact: true }).click();
  await gil.getByRole('button', { name: 'What do your files say?' }).click();
  await ana.getByRole('button', { name: /^Radio/ }).click();
  await expect(ana.getByText('¿Qué dicen tus archivos?').first()).toBeVisible();

  // Accuse with the right answers; both players get the verdict in their own language.
  await gil.getByRole('button', { name: /Accuse/ }).click();
  await gil.locator('form').getByRole('button', { name: answer.killer }).click();
  await gil.getByRole('radio', { name: answer.motive }).click();
  await gil.getByRole('radio', { name: answer.weapon }).click();
  await gil.getByRole('radio', { name: answer.alibi }).click();
  await gil.getByRole('button', { name: 'Submit accusation' }).click();

  // The lights go down and the theory is read out before the verdict.
  await expect(gil.getByText('The case holds')).toBeVisible({ timeout: 15_000 });
  await expect(ana.getByText('El caso se sostiene')).toBeVisible({ timeout: 15_000 });
  await gil.getByRole('button', { name: 'Skip' }).click();
  await ana.getByRole('button', { name: 'Saltar' }).click();

  await expect(gil.getByText('Case closed!')).toBeVisible();
  await expect(ana.getByText('¡Caso cerrado!')).toBeVisible();

  // The dossier tells the whole story.
  await gil.getByRole('button', { name: 'Read the dossier' }).click();
  await expect(gil.getByText('What really happened')).toBeVisible();
  await expect(gil.getByText('Killer', { exact: true })).toBeVisible();
});

test('a wrong accusation costs an attempt', async ({ browser }) => {
  const seed = 'E2E-WRONG-1';
  const answer = await solutionFor('Novice', 'gothic', seed);
  const page = await newPlayer(browser, 'en');
  await createCase(page, { name: 'Gil', seed, solo: true, difficulty: 'Novice' });

  await page.getByRole('button', { name: /Accuse/ }).click();
  const suspects = page.locator('form fieldset').first().getByRole('button');
  const wrong = (await suspects.allInnerTexts()).find(t => !t.includes(answer.killer))!.split('\n')[0];
  await page.locator('form').getByRole('button', { name: wrong }).click();
  await page.getByRole('radio', { name: answer.motive }).click();
  await page.getByRole('radio', { name: answer.weapon }).click();
  await page.getByRole('radio', { name: answer.alibi }).click();
  await page.getByRole('button', { name: 'Submit accusation' }).click();

  await expect(page.getByText('Objection!')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByText('3 of 4 correct')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the board' }).click();
  await expect(page.getByRole('button', { name: /Accuse/ })).toContainText('2 left');
});

test('solo lab tests take time and then unlock the result', async ({ browser }) => {
  const page = await newPlayer(browser, 'en');
  await createCase(page, { name: 'Gil', seed: 'E2E-LAB-1', solo: true, difficulty: 'Novice' });

  await page.getByRole('tab', { name: /Lab/ }).click();
  const runTest = page.getByRole('button', { name: 'Run test' }).first();
  await runTest.click();
  await expect(page.getByText(/In the lab · \d+s/)).toBeVisible();
  // Other tests wait their turn while one is running.
  await expect(page.getByRole('button', { name: 'Lab busy' }).first()).toBeVisible();
  // Novice tests take ten seconds.
  await expect(page.getByText(/In the lab/)).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText('Lab result ready', { exact: false })).toBeVisible();
});

test('a refresh mid-game goes straight back into the case', async ({ browser }) => {
  const gil = await newPlayer(browser, 'en');
  const code = await createCase(gil, { name: 'Gil', seed: 'E2E-REFRESH-1' });
  const ana = await newPlayer(browser, 'en');
  await ana.goto(`/?room=${code}`);
  await ana.locator('#name').fill('Ana');
  await ana.getByRole('button', { name: 'Join case' }).click();
  await expect(gil.getByText('Ana joined the case')).toBeVisible();

  await ana.reload();
  await expect(ana).toHaveURL(new RegExp(`room=${code}`));
  await expect(ana.locator('canvas').first()).toBeVisible();
  await expect(ana.getByRole('button', { name: 'Open the case' })).toHaveCount(0);

  // Gil still sees exactly one Ana, not a duplicate seat.
  await expect(gil.locator('header').getByText('Ana', { exact: true })).toHaveCount(1);
});

async function caseFacts(difficulty: string, theme: string, seed: string) {
  const engine = await import(pathToFileURL(path.resolve('server/dist/mysteryEngine.js')).href);
  const bp = engine.buildBlueprint(difficulty, theme, seed);
  const m = engine.localize(bp, 'en');
  return { bp, m };
}

async function pinFile(page: Page, title: string) {
  // In solo games a file can sit under either the Field or the Lab tab.
  for (const tab of [/^Field/, /^Lab/]) {
    await page.getByRole('tab', { name: tab }).click();
    const row = page.locator('aside li', { hasText: title });
    if (await row.count()) {
      await row.getByRole('button', { name: 'Pin', exact: true }).click();
      return;
    }
  }
  throw new Error(`file not found: ${title}`);
}

test('presenting the right clue makes a suspect crack; a wrong one costs points', async ({ browser }) => {
  const seed = 'E2E-CONFRONT-1';
  const { bp, m } = await caseFacts('Detective', 'studio', seed);
  const doc = bp.evidence.find((e: { kind: string }) => e.kind === 'document');
  const docTitle = m.evidence.find((e: { id: string }) => e.id === doc.id).title as string;
  const owner = m.suspects[doc.ref].name as string;
  const diaryTitle = m.evidence.find((e: { kind: string }) => e.kind === 'diary').title as string;

  const page = await newPlayer(browser, 'en');
  await page.goto('/');
  await page.locator('#name').fill('Gil');
  await page.getByRole('radio', { name: 'Solo' }).click();
  await page.getByRole('button', { name: /Stage Nine/ }).click();
  await page.getByRole('button', { name: 'More options' }).click();
  await page.locator('#seed').fill(seed);
  await page.getByRole('button', { name: 'Open the case' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();

  await pinFile(page, docTitle);
  await pinFile(page, diaryTitle);

  await page.getByRole('button', { name: 'Interrogate' }).click();
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(owner) }).click();
  await page.getByRole('tab', { name: 'Present evidence' }).click();

  await page.locator('footer').getByRole('button', { name: diaryTitle }).click();
  await expect(page.getByText('Went nowhere · −50 points')).toBeVisible();

  await page.locator('footer').getByRole('button', { name: docTitle }).click();
  await expect(page.getByText('Cracked', { exact: true }).first()).toBeVisible();
  // Each clue can only be presented to a suspect once.
  await expect(page.locator('footer').getByRole('button', { name: docTitle })).toBeDisabled();
});

test('a held-back clue arrives as a new lead', async ({ browser }) => {
  // Find a seed whose case holds a clue back.
  let seed = '';
  let lateTitle = '';
  for (let i = 0; i < 50 && !seed; i++) {
    const { bp, m } = await caseFacts('Mastermind', 'gothic', `E2E-LATE-${i}`);
    if (bp.lateEvidenceId) {
      seed = `E2E-LATE-${i}`;
      lateTitle = m.evidence.find((e: { id: string }) => e.id === bp.lateEvidenceId).title;
    }
  }
  expect(seed).not.toBe('');

  const page = await newPlayer(browser, 'en');
  await createCase(page, { name: 'Gil', seed, solo: true, difficulty: 'Mastermind' });
  await expect(page.locator('aside')).not.toContainText(lateTitle);
  await expect(page.getByText(`New lead: “${lateTitle}”`)).toBeVisible({ timeout: 20_000 });
});

test('weapons stay hidden until someone searches the right room', async ({ browser }) => {
  const seed = 'E2E-SEARCH-1';
  const engine = await import(pathToFileURL(path.resolve('server/dist/mysteryEngine.js')).href);
  const bp = engine.buildBlueprint('Novice', 'gothic', seed);
  const m = engine.localize(bp, 'en');
  const weapon = m.evidence.find((e: { kind: string }) => e.kind === 'weapon');
  const roomId = `room-${/^spot-(\d+)-/.exec(weapon.spotId)![1]}`;
  const room = m.plan.rooms.find((r: { id: string }) => r.id === roomId);
  const spot = room.spots.find((sp: { id: string }) => sp.id === weapon.spotId);
  const found = engine.searchSpot(bp, weapon.spotId, 'en').text as string;

  const page = await newPlayer(browser, 'en');
  await createCase(page, { name: 'Gil', seed, solo: true, difficulty: 'Novice' });

  await expect(page.getByText('Not found yet').first()).toBeVisible();
  await page.getByRole('button', { name: 'Floor plan' }).first().click();
  const plan = page.getByRole('dialog');
  await plan.locator('svg[role="img"] g').filter({ hasText: room.label }).first().click();
  await plan.getByRole('button', { name: spot.label }).click();
  await expect(plan.getByText(found)).toBeVisible();
});
