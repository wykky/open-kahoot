import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { GameServer } from './src/lib/game';
import { SOCKET_PATH } from './src/lib/socket-config';
import { initDb, closeDb, sweepInflightGamesOnBoot, deleteOldGames, getGameTsv } from './src/lib/db';
import { logRateLimitSummary } from './src/lib/rate-limit';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000');

// CORS allow-list. In dev we accept localhost; in prod we require explicit ALLOWED_ORIGINS env var.
// Default production set: live.atenu.org + Atenu Live tunnel (Cloudflare).
const defaultAllowed = dev
  ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]
  : [
      'https://live.atenu.org',
    ];

const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : defaultAllowed
);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Phase 4: DB init + boot sweep (mark any in-flight game as finished — server crashed mid-game)
initDb();
const swept = sweepInflightGamesOnBoot((gameId) => getGameTsv(gameId));
if (swept > 0) console.log(`[db] Boot sweep: marked ${swept} in-flight game(s) as finished`);

// Retention: delete games finished more than 366 days ago — runs every 24h
const RETENTION_DAYS = 366;
setInterval(() => {
  try {
    const removed = deleteOldGames(RETENTION_DAYS);
    if (removed > 0) console.log(`[db] Retention sweep: deleted ${removed} game(s) older than ${RETENTION_DAYS} days`);
  } catch (e) {
    console.error('[db] Retention sweep error:', e);
  }
}, 24 * 60 * 60 * 1000);

// Rate-limit observability: log per-limiter breach counts every 60s. Quiet when
// no breaches — this only fires under load or attack, so non-empty output is a signal.
setInterval(logRateLimitSummary, 60_000);

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(httpServer, {
    path: SOCKET_PATH,
    addTrailingSlash: false,
    // 512 KB cap — generous for a ~100-question quiz import, blocks 100MB DoS payloads
    maxHttpBufferSize: 512 * 1024,
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('[server] Socket.io CORS allow-list:', allowedOrigins);

  // Initialize the modular GameServer
  const gameServer = new GameServer(io);

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    gameServer.shutdown();
    closeDb();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    gameServer.shutdown();
    closeDb();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`Ready on http://${hostname}:${port}`);
      console.log('Game server initialized with modular architecture');
    });
});
