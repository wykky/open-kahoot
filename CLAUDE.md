# Atenu Live — Claude Code handoff

Standing brief for any Claude Code (or Cowork / general agent) session that picks up this project. Sits at repo root so it's auto-loaded.

**Repo location on Mac:** `/Users/wilfridnguessan/Documents/CLAUDE/Future ready sites/atenu-live/`
**Repo on VPS:** `/opt/stack/atenu-live/`
**Origin:** `github.com/wykky/open-kahoot`

## What this is

**Atenu Live** is a multiplayer live-quiz platform (Kahoot-style) for Ethiopian students, deployed at `https://live.atenu.org`. Fork of [`soleilvermeil/open-kahoot`](https://github.com/soleilvermeil/open-kahoot) maintained at [`wykky/open-kahoot`](https://github.com/wykky/open-kahoot).

**Audience:** Grade 9–12 students preparing for ESSLCE. Mobile-first. Most are on 3G/4G.

**Use modes:** classroom (host on projector, players on phones) AND remote/solo (everyone on phones, questions shown on player screens via toggle).

**Hosted at:** `live.atenu.org` (via Cloudflare Tunnel → 127.0.0.1:8096 → Docker container `atenu-live` on VPS `vps01.hulunem.com`).

## Stack

- **Next.js 15.5.12** (App Router, `src/` directory)
- **React 19**, **TypeScript**
- **Socket.io v4** (Next.js custom server in `server.ts`)
- **NextAuth.js v5 / Auth.js** (Google OAuth only; host-only — players play anonymously. Telegram sign-in was removed; existing `tg:`-prefixed user rows stay readable for past game history but no new Telegram sign-ins are accepted.)
- **better-sqlite3** for persistence (`/app/data/atenu.db`)
- **Tailwind v4** (Atenu brand: yellow `#FFC600` + black)
- **i18next** with English / Amharic / Oromo (Ge'ez glyphs via Noto Sans Ethiopic)
- **Custom HTTP server** at `server.ts` (not pure Next — boots Socket.io alongside Next)

## How development & deployment works

Single-folder workflow. Edit in the repo directly, push, VPS pulls.

1. **Edit on Mac.** Repo is at `/Users/wilfridnguessan/Documents/CLAUDE/Future ready sites/atenu-live/`. Claude (Cowork / Claude Code) writes directly to these files.
2. **Push:** `git add -A && git commit -m "..." && git push`.
3. **VPS pull + rebuild:**
   ```bash
   ssh vps01
   cd /opt/stack/atenu-live
   git pull && docker compose build && docker compose up -d
   ```
   First build after a clean is ~90s (compiles `better-sqlite3` against Alpine musl). Subsequent rebuilds use Docker layer cache.
4. **Verify:** `docker logs --tail 30 atenu-live | grep -iE "ready|idle-gc|allow-list"` should show:
   ```
   [server] Socket.io CORS allow-list: [ 'https://live.atenu.org' ]
   [idle-gc] Started — sweep every 5m, TTL 120m
   Ready on http://localhost:3000
   ```

## VPS layout

- Host: `vps01.hulunem.com` (Hostinger KVM 4, AlmaLinux 9.7, 4 vCPU, 16GB RAM)
- Code: `/opt/stack/atenu-live/`
- Persistent SQLite: `/opt/stack/atenu-live/data/atenu.db` (mounted into container as `/app/data/atenu.db`)
- Reverse proxy: **Cloudflare Tunnel** → `live.atenu.org` → `127.0.0.1:8096` → container port 3000
- WebSockets: native via the same tunnel (works out of the box)
- Backups: Restic to Backblaze B2 (Frankfurt). `/opt` is in the backup set so the SQLite DB is covered automatically.

## Required env vars (`/opt/stack/atenu-live/.env.local`)

```bash
NEXT_PUBLIC_APP_URL=https://live.atenu.org
NEXT_PUBLIC_GAME_PIN_LENGTH=6
NEXTAUTH_URL=https://live.atenu.org

# NextAuth + providers
AUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=atenu_live_bot

# Game security (HMAC secret for host + player tokens)
GAME_SECRET=<openssl rand -base64 32>

# Optional
# ALLOWED_ORIGINS=https://live.atenu.org    # override CORS allow-list
# OPENAI_API_KEY=...                        # enables /api/generate-questions
```

`server.ts` reads `ALLOWED_ORIGINS` and rejects all other origins via Socket.io CORS. `GAME_SECRET` is separate from `AUTH_SECRET` so we can rotate independently.

### Sensitive secrets — leak impact + rotation

- **`AUTH_SECRET`** — signs every NextAuth JWT. Leak ⇒ session forgery for every signed-in user. Rotation invalidates all existing sessions; everyone has to sign in again.
- **`GAME_SECRET`** — HMAC key for host + player tokens. Leak ⇒ attacker can forge `hostToken` / `playerToken` for any active game. Rotation invalidates in-flight games (hosts get kicked back to lobby on next action). Safe to rotate between sessions.
- **`TELEGRAM_BOT_TOKEN`** — IS the HMAC verification key for Telegram Login Widget payloads (`auth.ts` derives the secret as `sha256(botToken)`). Leak ⇒ attacker can forge a valid Telegram login for any Telegram `id` and become a host. JWT sessions survive rotation (they're signed by `AUTH_SECRET`), so existing logins keep working — only new forgeries are blocked. Rotation runbook:
  1. On phone: open BotFather → `/mybots` → `atenu_live_bot` → `API Token` → `Revoke current token`. Copy new token.
  2. `ssh vps01 && cd /opt/stack/atenu-live && nano .env.local` → replace `TELEGRAM_BOT_TOKEN=...` → save.
  3. `docker compose up -d --force-recreate` (env-only change, no rebuild needed).
  4. Verify: `docker logs --tail 30 atenu-live | grep -i ready`. Test sign-in from incognito window.
- **`GOOGLE_CLIENT_SECRET`** — Leak ⇒ attacker can build a phishing app posing as Atenu Live to harvest tokens. Rotate via Google Cloud Console; existing sessions survive.

## Auth model (important to understand)

- **Players** can join anonymously with just a nickname. They get a `persistentId` (UUID) + `playerToken` (HMAC) stored in `localStorage` per-PIN. No account needed.
- **Hosts** MUST sign in (Google or Telegram). NextAuth v5 with `next-auth@beta`. Custom Telegram Login Widget via Credentials provider with HMAC verification (see `auth.ts` — the gotcha is excluding NextAuth's auto-injected `csrfToken` and `callbackUrl` fields from the HMAC input).
- **Atenu's old Authentik server is still running** at `auth.atenu.org` but Atenu Live no longer uses it. Was abandoned in favor of Google + Telegram per host-only sign-in design.

### Token flow (security model)

- `createGame` callback returns `(game, hostToken)`. Client stores `host_token_{gameId}` in **localStorage** (not sessionStorage — survives tab close + 5-min server-side grace timer).
- Every host event (`startGame`, `nextQuestion`, `showLeaderboard`, `endGame`, `downloadGameLogs`, `toggleDyslexiaSupport`) requires `hostToken`. Server verifies via `crypto.timingSafeEqual` against `HMAC(GAME_SECRET, "host:{gameId}:{hostId}")`.
- `joinGame` returns `(success, game?, playerId?, playerToken?)`. Client stores `player_id_{pin}` + `player_token_{pin}` in localStorage. Reconnect requires both.
- `submitAnswer` carries `(persistentId, playerToken, qEpoch, clientPerceivedMs)`. Server validates token, qEpoch matches current phase, grace window not expired.
- `validateGame` takes an `auth` object `{ hostToken? | playerId+playerToken? }`. Used by the page on mount to identify the socket. Without valid token, sync to current phase is gated (no question shown during answering phase — kills second-tab cheat).

## SQLite schema (5 tables, normalized)

Defined in `src/lib/db/index.ts` migration block. Single source of truth.

- **`users`** — `(id PK, provider, provider_user_id, email, name, avatar_url, vip, created_at, last_seen_at)`. Upserted on NextAuth sign-in. `provider_user_id` is Google `sub` OR `tg:<id>`. `vip` column exists but **isn't synced from WordPress yet** (decision: dropped feature for now).
- **`games`** — `(id PK, pin, host_user_id FK, host_player_id, title, settings_json, status, current_question_index, player_count, question_count, created_at, started_at, finished_at, tsv_data)`. `tsv_data` is generated once at finish and stored — lets TSV download survive container restart + game cleanup.
- **`questions`** — `(game_id, question_index PK composite, id, text, options_json, correct_answer, time_limit, explanation, image_url)`. Snapshot at game-creation time.
- **`players`** — `(id, game_id PK composite, user_id FK nullable, name, final_score, is_host, has_dyslexia_support, joined_at)`. `user_id` is null for anonymous nickname players.
- **`answers`** — `(game_id, player_id, question_index PK composite, answer_index, answer_time, response_time_ms, points_earned, was_correct, has_dyslexia_support)`. Every answer ever submitted.

Boot sweep: any game with `status != 'finished'` on container start is marked finished (server crashed mid-game). Their TSVs are pre-generated from data already in the DB.

Retention: games with `finished_at < now - 366 days` are deleted by a daily cron in `server.ts`.

## Game phase state machine

Defined in `src/lib/game/GameplayLoop.ts`. Order:

```
waiting → preparation → thinking → answering → results → leaderboard → (next preparation OR finished)
                                       ↓
                              (answers stored to history,
                               scores updated, host shown stats,
                               players shown personal result)
```

- `thinking`: question shown, no answers yet. Duration: `settings.thinkTime` (default 5s).
- `answering`: answers accepted. Duration: `settings.answerTime` + 1s grace (`ANSWER_GRACE_MS`). Phase auto-ends early if all connected players answer.
- `results`: scoring + stats. Stays until host clicks "Show Leaderboard".
- `leaderboard`: shown to host with "Next Question" button. Stays until host advances.
- `finished`: TSV generated + stored, game dropped from memory after 60s (DB record stays for downloads).

Phase 6 added `qEpoch` (bumps on every `thinking` and `answering` entry) — server rejects answers with stale qEpoch.

## Audit history (Phases 1-8) — what's already shipped

All these are deployed and verified. Don't redo them.

### Phase 1 — security hygiene
- `src/lib/game/validators.ts` (new): input validation with named limits (title≤200ch, ≤200 questions, options must be exactly 4, time bounds 3-120s, image must be `https?://`, NFC-normalized player names)
- `server.ts`: CORS allow-list (was `*`), `maxHttpBufferSize` dropped 100MB → 512KB
- `GameManager.ts`: PIN generation via `crypto.randomInt` (not `Math.random`); bounded retry loop

### Phase 2 — HMAC tokens + grace + late-join gate
- `src/lib/game/tokens.ts` (new): stateless HMAC issue/verify via `GAME_SECRET`
- Wire protocol breaking changes: `createGame` callback now `(game, hostToken)`; all host events take trailing `hostToken`; `submitAnswer` carries `playerToken`
- Host disconnect: 5-minute grace timer instead of instant game-end
- `validateGame` gates late joiners during answering phase — unknown sockets get `waitForNextQuestion` event instead of the live question (kills second-tab cheat)

### Phase 3 — perf
- `sanitizeGameForClient(game)` helper strips `answerHistory` from every Game broadcast (was O(n²) bandwidth at 200 players)
- Idempotent `storeAnswersToHistory` guard (fixes duplicate last-question row in TSV exports)
- Smooth timer bar component (`SmoothTimerBar` in `GameAnsweringPhaseScreen.tsx`, also in `Timer.tsx`): single CSS transition from 100% → 0% over full duration. No more stuck-at-3% on last second.

### Phase 4 — SQLite persistence (4A/4B/4C combined)
- `src/lib/db/index.ts` (new): connection, schema migration, all repo functions including `getLeaderboard()`
- `Dockerfile`: added Alpine build deps (`python3 make g++ libc-dev`) for native compile
- `docker-compose.yml`: added volume mount `/opt/stack/atenu-live/data:/app/data`
- `server.ts`: DB init + boot sweep + 24h retention cron
- Write-through: every game state mutation persists to DB
- TSV download falls back to DB lookup for older finished games no longer in memory
- NextAuth `jwt` callback upserts users into the `users` table
- New `/leaderboard` page (server component, queries SQLite, public)

### Phase 5 — idle-game GC
- `GameplayLoop` constructor starts a 5-min `setInterval` sweep
- Auto-finishes games with `lastActivityAt < now - 2h`
- `markActive(gameId)` called from every mutating event handler

### Phase 6 — server-authoritative deadline
- Events `thinkingPhase` and `answeringPhase` now carry `{ serverNow, deadlineMs, qEpoch }`
- Client computes clock skew, renders accurate countdown
- Server accepts late answers within `ANSWER_GRACE_MS = 1000ms` (compensates 3G latency)
- `submitAnswer` rejected if `qEpoch !== game.qEpoch` (kills race conditions)

### Phase 7 — single-session lock + socketId index + minor UX
- `GameManager.attachSocket/detachSocket/getGameForSocket` — O(1) disconnect lookup
- Reconnect with same `playerId` from new socket kicks the old socket via `kicked` event
- Client receives `kicked` → alert + redirect to `/`
- Top-right nav redesigned: 40×40 icon-only buttons (Leaderboard, UserMenu, LanguageSelector)
- Title pushed down on mobile (`mt-12 sm:mt-0`) to avoid collision with nav icons
- Discard active game button (bottom-left of host lobby)

### Phase 8 — adaptive scoring + tie-aware rank + bandwidth detection
- Client sends `clientPerceivedMs` with submission (time from `answeringPhase` arrival to click on client clock)
- Server uses client time IF `|server - client| <= 2000ms` (defends against `0ms` cheaters)
- Logs show `[client-time]` marker when adaptive scoring kicked in
- Leaderboard page uses competition ranking (1, 1, 3, 4, 5, 5, 7)
- `src/lib/hooks/useConnectionTier.ts` (new): reads `navigator.connection.effectiveType`. On 2g/3g/saveData: question images hidden + "Image hidden — slow connection" badge

## File layout (Atenu Live customizations)

Beyond the upstream Open-Kahoot files, these are ours:

```
server.ts                                        # custom server (Socket.io + DB init + retention cron)
src/auth.ts                                      # NextAuth config (Google + Telegram + DB upsert)
src/middleware.ts                                # protects /host route (signed-in only)
src/app/auth/signin/page.tsx                    # custom branded sign-in page
src/app/leaderboard/page.tsx                    # public weekly/monthly/all-time leaderboard
src/app/host/page.tsx                           # host quiz creation + lobby + auto-resume + discard button
src/app/game/[id]/page.tsx                      # gameplay page (host + player view)
src/app/api/auth/[...nextauth]/route.ts         # NextAuth route handler
src/app/api/generate-questions/route.ts         # OpenAI-based AI quiz generation (optional)

src/components/PageLayout.tsx                   # outer layout with top-right nav cluster
src/components/UserMenu.tsx                     # auth state widget (signed in vs out)
src/components/LanguageSelector.tsx             # i18n widget
src/components/SessionWrapper.tsx               # NextAuth SessionProvider wrapper
src/components/TelegramLoginButton.tsx          # Telegram Login Widget integration
src/components/game-screens/GameAnsweringPhaseScreen.tsx  # has SmoothTimerBar
src/components/game-screens/GameThinkingPhaseScreen.tsx
src/components/game-screens/GameResultsPhaseScreen.tsx    # shows correct answer + explanation on phones
src/components/player-screens/PlayerThinkingScreen.tsx    # uses useConnectionTier
src/components/player-screens/PlayerAnsweringScreen.tsx   # uses useConnectionTier
src/components/player-screens/PlayerResultsScreen.tsx     # highlights correct/wrong answer
src/components/host-setup/HostGameSettingsSection.tsx     # has "Show questions on player phones" toggle
src/components/join-screens/JoinGameFormScreen.tsx        # forwards dbUserId to server
src/components/Timer.tsx                        # smooth thinking-phase bar

src/lib/db/index.ts                             # SQLite connection, schema, repos
src/lib/game/GameManager.ts                    # PIN generation, socketToGame index, idle markActive
src/lib/game/PlayerManager.ts                  # joinGame with kick logic, adaptive scoring
src/lib/game/GameplayLoop.ts                   # phase orchestration, idle-game GC, deadline protocol
src/lib/game/EventHandlers.ts                  # all socket event wiring + validation
src/lib/game/tokens.ts                         # HMAC issue/verify
src/lib/game/validators.ts                     # input validation
src/lib/hooks/useConnectionTier.ts             # navigator.connection wrapper

src/types/game.ts                              # all socket event signatures + Game/Player types
src/locales/{en,am,om}.json                    # English / Amharic / Afan Oromo
```

## Known parked items / backlog

### Parked bugs (low priority)
- Two debug logs still in production: server-side `[CREATE_GAME] Issued hostToken ...` + `[showLeaderboard] Rejected ...` (intentionally kept until current testing wraps up; remove when comfortable). Also a `console.log('[client] showLeaderboard ...')` in `game-id-page.tsx`.

### Audit items not done
- **`<img>` → `next/image`**: deferred. Decided to silence warnings instead; `next/image` would require domain whitelisting per quiz image URL which is brittle for user-imported images.
- **Bandwidth-tier transport V2**: only V1 (client-side detection) shipped. V2 would have the server measure RTT via Socket.io ping and tag slow sockets explicitly. Skipped pending real-world need.
- **WordPress VIP REST endpoint**: dropped. Was going to be `/wp-json/atenu/v1/vip?email=` populating `session.user.vip`. Decided VIP source on atenu.org WP isn't ready to define. `users.vip` column exists in SQLite but stays 0.
- **Per-school sub-tournaments**: not started.
- **Native-speaker review** of `am.json` + `om.json`: pending.
- **ESSLCE question bank import**: not started.

### Larger future directions (from earlier strategy discussions)
- Astro public site at `atenu.org` (replaces WordPress frontend, keeps WP as headless CMS). Course catalog pulls from WP REST. Decided this is a separate project, not part of Atenu Live.
- Possible Frappe LMS pilot for one course later. Moodle stays for exam.atenu.org (timed mock ESSLCE). No SSO unification.
- The Authentik install on the VPS is currently unused but kept running (decision made not to decommission).

## Conventions to follow

- **Don't break the wire.** When changing socket event signatures, update both `types/game.ts` AND every emit + on-handler in sync. Backward-compat shims are fine for callbacks (optional trailing args).
- **Tokens are sacred.** Don't add new host or player events without verifying the token via `handleHostEvent` or explicit `verifyPlayerToken`.
- **Persist via DB write-through.** Don't add in-memory-only state for anything game-related. If you'd want to recover it on container restart, write it to SQLite.
- **No CSS frameworks beyond Tailwind v4.** Custom CSS goes in `src/app/globals.css` only.
- **Brand palette:** yellow `bg-yellow-400` + black borders. Trophy/wifi/etc icons from `lucide-react`.
- **Mobile-first.** Default classes target mobile; `sm:` prefix is tablet+. Aim for 40px+ touch targets.
- **Player screens are the priority surface.** Hosts use big screens, players are on phones. UX gaps on phone are higher-severity than on desktop.
- **i18next keys exist for everything in player UX.** Don't hard-code strings on player screens. Hosts get less translation love.

## When working on this codebase

### Suggested next tasks (pick based on user direction)

1. **Game history page for hosts.** Show each host their past games at `/host/history` — list with PIN, title, date, player count, link to download TSV. Already in DB. ~1 file.
2. **"My past games" for players.** Same idea for signed-in players via the players table joined on user_id.
3. **Strip the debug logs** added during the hostToken-bug hunt (host page + EventHandlers + game-id page).
4. **Native-speaker review pipeline** for translations (might be a Telegram bot task, not a code task).
5. **Per-quiz public leaderboard at `/leaderboard/<gameId>`** — single-game permalink for sharing.

### Useful commands while developing

```bash
# Watch live server logs (filtered)
docker logs -f atenu-live 2>&1 | grep -iE "PIN|error|warn"

# Check what's in the DB (need to apk add sqlite first time)
docker exec atenu-live sh -c 'apk add --no-cache sqlite > /dev/null 2>&1; sqlite3 /app/data/atenu.db ".tables"'
docker exec atenu-live sqlite3 /app/data/atenu.db "SELECT pin, status, finished_at FROM games ORDER BY created_at DESC LIMIT 10"

# Check active games + memory
docker exec atenu-live sh -c "echo 'SELECT COUNT(*) AS games, SUM(CASE WHEN status != \"finished\" THEN 1 ELSE 0 END) AS active FROM games' | sqlite3 /app/data/atenu.db"

# Verify env loaded
docker exec atenu-live printenv | grep -E "GAME_SECRET|AUTH_SECRET|GOOGLE|TELEGRAM"

# Full deploy after edits
cd /opt/stack/atenu-live && git pull && docker compose build && docker compose up -d && sleep 30 && docker logs --tail 30 atenu-live | grep -iE "ready|idle-gc"
```

### Things to NOT do

- **Don't reintroduce Authentik dependencies in Atenu Live.** The auth model is Google + Telegram. Authentik is for other Atenu products (future Moodle/Frappe integrations) — not this one.
- **Don't add LiteSpeed Cache or any WP plugin to Atenu Live.** It's not WordPress. (Today's WP outage was caused by exactly this mental crossover.)
- **Don't touch `wp-config.php` of atenu.org from this project.** Atenu Live and atenu.org WP are separate apps; Atenu Live has no direct dependency on WP yet.
- **Don't store hostToken in `sessionStorage`.** It must be `localStorage` (survives tab close for the 5-min grace window).
- **Don't put middleware.ts at project root** in this repo — Next.js with `src/` directory requires `src/middleware.ts`. (Took an hour to debug this once already.)
- **Don't read `gameId` from the React closure in `game/[id]/page.tsx` for security-critical paths.** Read from `window.location.pathname.split('/')[2]` — closure was found stale and broke `Show Leaderboard` hostToken delivery once already.

## Recent stable commits to reference

Look at git log for these commits as known-good landmarks:

- `Phase 8: adaptive scoring, tie-aware leaderboard ranks, discard active game button`
- `Phase 7: socketId->gameId index, single-active-session lock, kicked event + title spacing fix`
- `Phase 6: server-authoritative deadline + qEpoch + 1s grace window`
- `Phase 5: idle-game GC auto-finish games after 2h of inactivity`
- `Phase 4A+4B+4C: SQLite persistence, user identity, leaderboard`
- `Phase 2: HMAC tokens (host+player), host disconnect grace, late-join gate, smooth timer bar`
- `Phase 1: input validation, CORS allow-list, crypto PINs, 512KB buffer cap`

If something regresses, `git bisect` between these is fast.

---

**One-line summary if you only read this:** Next.js + Socket.io + SQLite multiplayer quiz, host-only Google/Telegram auth, server-authoritative deadlines with grace, HMAC tokens for both host and player, write-through persistence, automatic idle-game GC, single-session lock, leaderboard page. Mobile-first Ethiopian student audience on 3G/4G. Don't break the wire protocol; always update types + emits + handlers together. Repo at `/Users/wilfridnguessan/Documents/CLAUDE/Future ready sites/atenu-live/` on Mac, `/opt/stack/atenu-live/` on VPS, edits committed and pushed directly — no separate patches staging area.
