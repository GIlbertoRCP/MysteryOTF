# Detective Board Sync

A co-op murder mystery played on a shared corkboard. One player is the **Lead Detective** (witnesses, alibi checks, photos, phone records, documents), the other the **Forensic Analyst** (autopsy, prints, shoeprints, lab traces, fingernail scrapings). Neither can solve the case alone: pin your clues to the board, tie them together with string, and accuse the killer, motive, weapon and broken alibi before your three attempts run out.

- **Two languages.** Each player picks English or Spanish on their own, so you can play together in different languages. Quick phrases and quoted interrogation answers in the radio chat are translated for the other player.
- **Solo mode.** One detective holds both sets of files. Lab results have to be requested and take a little time to come back. An optional **lab assistant** (off by default) answers on the radio and nudges you when you go quiet.
- **Today's case.** Everyone gets the same case each day. Copy your result to share it.
- **Hints and score.** Four hints per case, each more specific. Hints, wrong accusations and time cost points.
- **Tutorial.** A short guided case for first-timers.

## Run it locally

```bash
npm run setup
```

```bash
npm run dev
```

Open http://localhost:5173, start a case, and send your partner the invite link from the header.

## Put it online (Render)

GitHub Pages only serves static files, and this game needs a running server for the live board and to keep the solution secret. Render's free plan runs both the server and the page from one service, set up by `render.yaml`:

1. Push this repository to GitHub.
2. On https://render.com, sign in with GitHub and choose **New > Blueprint**.
3. Pick this repository and confirm. Render builds it and gives you a URL like `https://detective-board-sync.onrender.com`.

Every later push to the main branch redeploys automatically.

Things to know about the free plan:

- After about 15 minutes with nobody connected, the service sleeps. The next visit takes up to a minute to wake it.
- Cases live in server memory, so a sleep, restart or redeploy ends any case in progress.

## How cases are generated

`server/src/mysteryEngine.ts` builds each case from a seed, so the same seed, setting and difficulty always produce the same case. It keeps rerolling until the clues point to exactly one suspect *and* neither player's half of the evidence is enough on its own. The solution never leaves the server.

Content lives in `server/src/content/` (shared clue text in `common.ts`, the six settings in `themes.ts`), with every string in English and Spanish. UI text is in `client/src/i18n.tsx`.

Check the generator after changing content:

```bash
cd server && npm test
```
