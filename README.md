# Detective Board Sync

A co-op murder mystery played on a shared corkboard. One player is the **Lead Detective** (witnesses, alibi checks, photos, phone records, documents), the other the **Forensic Analyst** (autopsy, prints, shoeprints, lab traces, fingernail scrapings). Neither can solve the case alone: pin your clues to the board, tie them together with string, and accuse the killer, motive, weapon and broken alibi before your three attempts run out.

- **Two languages.** Each player picks English or Spanish on their own, so you can play together in different languages. Quick phrases and quoted interrogation answers in the radio chat are translated for the other player.
- **Solo mode.** One detective holds both sets of files. Lab results have to be requested and take a little time to come back. An optional **lab assistant** (off by default) answers on the radio and nudges you when you go quiet.
- **Today's case.** Everyone gets the same case each day. Copy your result to share it.
- **Hints and score.** Four hints per case, each more specific. Hints, wrong accusations and time cost points.
- **Tutorial.** A short guided case for first-timers.
- **Nine settings.** A gothic manor, a cyberpunk tower, an opera house, a 1950s casino, a snowbound express, a Day of the Dead hacienda, a Hollywood studio, an Arctic research station and a Venetian masquerade.
- **Accomplices.** On Mastermind, about half the cases have a second suspect who lies to cover for the killer. Name them too.
- **Floor plan.** Every case has a blueprint of its location (press P), with a 3D view you can orbit. It shows where the body and items were found, who claims each room, and walking times. On Detective and Mastermind, one suspect is cleared by distance: seen too far from the scene to have reached it in time.
- **Hands-on clues.** Match the shoeprint, fit the hand to the prints, sweep a UV lamp, type the blood, piece together torn letters and decode the diary. A "Just show me" link skips any puzzle.
- **Search the rooms.** Rooms on the floor plan start dark. Click a glowing spot (in the blueprint or in 3D) to search it: the lights come on, and recovered items only turn up in your files once someone finds them.
- **3D evidence.** Recovered items can be turned over in 3D. Under the lab lamp, the one that was wiped "but not well" gives itself away. The victim's broken watch shows when it stopped (with an engraving on the back), planted items carry someone's initials, and letters carry their sender's wax seal.
- **Timeline.** Pinned clues with a time land on a shared timeline, and anything that breaks an alibi glows red.
- **Confrontations.** In the interrogation room, present any clue on the board to a suspect. The right clue makes them crack: they admit a motive, the accomplice confesses the lie, or the falsely accused are cleared. A clue that goes nowhere costs 50 points. A stress meter shows each suspect's heart rate, and a suspect who cracks unlocks a follow-up question. Alibis get stamped confirmed, disputed or broken as the evidence comes in, in the interrogation room and the case file.
- **More twists.** Some cases hide a planted item meant to frame an innocent (the lab shows it was placed after the death), a witness who lies (a staff record proves it), or a clue that arrives a few minutes in as a new lead.
- **Complications.** On Detective and Mastermind, some cases add a blackout (no one could see coats, so the board is torchlit and the radio crackles), a storm (footprints washed out, heavy rain and lightning) or tampered evidence (a decoy weapon was smeared to look like the real one).
- **Suspect portraits.** Every suspect has an illustrated portrait whose coat and habits match the case file. Suspects look nervous once a confrontation rattles them or you tag them as prime suspect.
- **The accusation.** The lights go down and your theory is read out point by point (motive, means, opportunity) before the verdict lands, with an "Objection!" if it doesn't hold.
- **Case dossier.** Once a case closes, read the full write-up: time taken, false leads, hints, places searched, who everyone really was, and what actually happened minute by minute. Save it as a PDF from the browser's print dialog.
- **Atmosphere.** Flashlight mode, weather for each setting, and a camera push-in when the verdict lands.
- **Phones and tablets.** Pinch to zoom the board, files open as a bottom sheet, and the card toolbar docks where your thumb can reach.

## Run it locally

```bash
npm run setup
```

```bash
npm run dev
```

Open http://localhost:5173, start a case, and send your partner the invite link from the header.

## Put it online (Render)

GitHub Pages only serves static files, and this game needs a running server for the live board and to keep the solution secret. `render.yaml` sets up two free Render services: the game itself, and a Key Value store (Redis-compatible) that keeps cases alive.

1. Push this repository to GitHub.
2. On https://render.com, sign in with GitHub and choose **New > Blueprint**.
3. Pick this repository and confirm. Render creates both services and gives you a URL like `https://detective-board-sync.onrender.com`.

If you already created the service from an older version of `render.yaml`, Render picks up the new Key Value store from the Blueprint the next time it syncs. You may need to approve the change on the Blueprint page in the dashboard.

How it behaves:

- **Deploys wait for the checks.** Pushes to `main` deploy only after the GitHub Actions checks pass, so a broken commit never goes live.
- **Cases survive restarts.** Each change to a case is saved. If the server sleeps, restarts or redeploys mid-game, both players are reconnected to the same board.
- **Dropped connections get 30 seconds.** If a player's connection drops or they refresh, their seat is held and their partner sees "reconnecting…".
- **Free plan limits.** The web service sleeps after about 15 minutes with nobody connected, and the next visit takes up to a minute to wake it. The free Key Value store doesn't write to disk, so a rare restart of the store itself would still lose open cases. Saved cases expire after two days without activity.

## Tests

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript in the server and client |
| `npm test` | Generates 1,080 cases and checks each is solvable, needs both players, and is fully translated |
| `npm run test:e2e` | Builds the game and plays it in a real browser: a two-player game in two languages, a wrong accusation, solo lab tests, and refreshing mid-game |

The restart test also needs a Redis:

```bash
docker run -d -p 6390:6379 redis:7-alpine
```

```bash
TEST_REDIS_URL=redis://localhost:6390 npx playwright test restart
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of these, including the restart test, on every push and pull request.

## How cases are generated

`server/src/mysteryEngine.ts` builds each case from a seed, so the same seed, setting and difficulty always produce the same case. It keeps rerolling until the clues point to exactly one suspect *and* neither player's half of the evidence is enough on its own. The solution never leaves the server.

Content lives in `server/src/content/` (shared clue text in `common.ts`, the nine settings in `themes.ts`), with every string in English and Spanish. UI text is in `client/src/i18n.tsx`.

Check the generator after changing content:

```bash
cd server && npm test
```
