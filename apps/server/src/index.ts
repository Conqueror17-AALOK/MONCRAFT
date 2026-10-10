import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import os from 'os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { WebSocket } from 'ws';
import {
  TOTAL_AGENTS,
  CORE_AI_COUNT,
  AUDIENCE_COUNT,
  NPC_COUNT,
  WebSocketServerMessage,
  WebSocketClientMessage
} from '@civilization/shared';
import { EconomyEngine } from './economy/market.js';
import { PersistenceManager } from './persistence/database.js';
import { GameSimulationEngine } from './simulation/gameLoop.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '4000', 10);
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const DB_FILE = process.env.DATABASE_FILE || './data/civilization.db';

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'production'
    ? { level: 'info' }
    : { level: 'debug' }
});

const connectedClients = new Set<WebSocket>();

// Initialize Core Subsystems
const economy = new EconomyEngine();
const persistence = new PersistenceManager(DB_FILE);

// Initialize Authoritative Game Simulation Engine
const gameEngine = new GameSimulationEngine(economy, persistence, {
  onDeltaUpdate: (delta) => {
    if (connectedClients.size === 0) return;
    const msg: WebSocketServerMessage = {
      type: 'DELTA_UPDATE',
      payload: delta
    };
    const serialized = JSON.stringify(msg);
    for (const client of connectedClients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(serialized);
      }
    }
  },
  onWorldEvent: (evt) => {
    fastify.log.info({ evt }, 'Civilization World Event');
    if (connectedClients.size > 0) {
      const msg = JSON.stringify(evt);
      for (const client of connectedClients) {
        if (client.readyState === 1 /* OPEN */) {
          client.send(msg);
        }
      }
    }
  }
});

async function bootstrap() {
  await fastify.register(cors, {
    origin: '*'
  });

  await fastify.register(websocket);

  // Health check endpoint for Docker & status monitoring
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: Date.now(),
      agentsCount: gameEngine.getAgents().length,
      coreAICount: CORE_AI_COUNT,
      audienceCount: AUDIENCE_COUNT,
      npcCount: NPC_COUNT,
      connectedClients: connectedClients.size,
      uptimeSeconds: process.uptime()
    };
  });

  // REST: Network discovery for mobile QR spectator auto-connection
  fastify.get('/api/network', async () => {
    const nets = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    return {
      lanIp: ips[0] || '127.0.0.1',
      allIps: ips,
      serverPort: PORT,
      clientPort: 3000
    };
  });

  // REST: Get full 40-agent roster
  fastify.get('/api/agents', async () => {
    return gameEngine.getAgents();
  });

  // REST: Get single agent slot details
  fastify.get<{ Params: { slotId: string } }>('/api/agents/:slotId', async (req, reply) => {
    const slot = parseInt(req.params.slotId, 10);
    const agent = gameEngine.getAgentBySlot(slot);
    if (!agent) {
      return reply.code(404).send({ error: 'Agent slot not found' });
    }
    return agent;
  });

  // REST: Get current market book & prices
  fastify.get('/api/market', async () => {
    return economy.getMarketBook();
  });

  // REST: Get historical market price data for economic charts
  fastify.get('/api/market/history', async () => {
    return economy.getPriceHistory();
  });

  fastify.get<{ Params: { resource: string } }>('/api/market/history/:resource', async (req, reply) => {
    const resKey = req.params.resource.toUpperCase() as any;
    const history = economy.getPriceHistory(resKey);
    return history;
  });

  // REST: Get current market desk (order book, recent fills, treaties)
  fastify.get('/api/economy/desk', async () => {
    return gameEngine.getMarketDesk();
  });

  // REST: Get recent Monad blockchain transactions
  fastify.get('/api/blockchain/transactions', async () => {
    return {
      isLiveOnChain: gameEngine.getMonadService().isLiveOnChain(),
      pendingCount: gameEngine.getMonadService().getPendingCount(),
      transactions: gameEngine.getMonadService().getRecentTransactions()
    };
  });

  // REST: Submit participant guidance directive to audience agent
  fastify.post<{
    Params: { slotId: string };
    Body: { directive: string; backerAddress?: string };
  }>('/api/agents/:slotId/directive', async (req, reply) => {
    const slot = parseInt(req.params.slotId, 10);
    const { directive, backerAddress } = req.body || {};

    if (!directive) {
      return reply.code(400).send({ error: 'Directive is required' });
    }

    gameEngine.setAgentDirective(slot, directive, backerAddress);
    return { success: true, slotId: slot, directive };
  });

  // REST: Fund agent (simulated deposit / on-chain confirmation hook)
  fastify.post<{
    Params: { slotId: string };
    Body: { amountMon: number; backerAddress: string; customName?: string };
  }>('/api/agents/:slotId/fund', async (req, reply) => {
    const slot = parseInt(req.params.slotId, 10);
    const { amountMon, backerAddress, customName } = req.body || {};

    if (!amountMon || !backerAddress) {
      return reply.code(400).send({ error: 'amountMon and backerAddress are required' });
    }

    gameEngine.fundAgent(slot, amountMon, backerAddress, customName);
    return { success: true, slotId: slot, amountMon, backerAddress, customName };
  });

  // REST: Rename audience slot agent
  fastify.post<{
    Params: { slotId: string };
    Body: { name: string; backerAddress?: string };
  }>('/api/agents/:slotId/rename', async (req, reply) => {
    const slot = parseInt(req.params.slotId, 10);
    const { name, backerAddress } = req.body || {};

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Valid agent name is required' });
    }

    const result = gameEngine.renameAgent(slot, name, backerAddress);
    if (!result.success) {
      return reply.code(400).send(result);
    }
    return result;
  });

  // REST: Get participant's backed agents and claimable dividend rewards
  fastify.get<{ Params: { address: string } }>('/api/backers/:address/rewards', async (req, reply) => {
    const { address } = req.params;
    if (!address) {
      return reply.code(400).send({ error: 'Backer address is required' });
    }
    const info = gameEngine.getBackerRewards(address);
    return { backerAddress: address, ...info };
  });

  // REST: Claim participant dividend payout
  fastify.post<{ Params: { address: string } }>('/api/backers/:address/claim', async (req, reply) => {
    const { address } = req.params;
    if (!address) {
      return reply.code(400).send({ error: 'Backer address is required' });
    }
    const result = await gameEngine.claimBackerPayout(address);
    return result;
  });

  // REST: Get live on-chain Monad balance
  fastify.get<{ Params: { address: string } }>('/api/wallet/:address/balance', async (req, reply) => {
    const { address } = req.params;
    if (!address) {
      return reply.code(400).send({ error: 'Wallet address is required' });
    }
    const balance = await gameEngine.getMonadService().getBalance(address);
    return { address, balanceMon: balance, chainId: 10143 };
  });

  // WebSocket Server Endpoint: Real-time 3D Spectator Synchronization
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws', { websocket: true }, (socket, req) => {
      connectedClients.add(socket as unknown as WebSocket);
      fastify.log.info({ clientCount: connectedClients.size }, 'New WebSocket client connected');

      // Send initial full world snapshot
      const snapshot = gameEngine.getWorldSnapshot();
      const initMsg: WebSocketServerMessage = {
        type: 'INIT_WORLD',
        payload: snapshot
      };
      socket.send(JSON.stringify(initMsg));

      socket.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString()) as WebSocketClientMessage;
          if (parsed.type === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          } else if (parsed.type === 'SEND_DIRECTIVE') {
            gameEngine.setAgentDirective(parsed.slotId, parsed.directive, parsed.backerAddress);
          }
        } catch (err) {
          fastify.log.error({ err }, 'Invalid WS message format');
        }
      });

      socket.on('close', () => {
        connectedClients.delete(socket as unknown as WebSocket);
        fastify.log.info({ clientCount: connectedClients.size }, 'WebSocket client disconnected');
      });

      socket.on('error', (err) => {
        fastify.log.error({ err }, 'WebSocket client error');
        connectedClients.delete(socket as unknown as WebSocket);
      });
    });
  });

  // Start authoritative 10 Hz game loop
  gameEngine.start(10);
  fastify.log.info('Game Simulation Engine started at 10 Hz authoritative tick rate');

  // Register static client serving for unified production deployment
  const candidatePaths = [
    path.resolve(process.cwd(), 'apps/client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), '../client/dist')
  ];
  const clientDistPath = candidatePaths.find((p) => fs.existsSync(p));

  if (clientDistPath) {
    fastify.log.info(`Serving static client SPA bundle from: ${clientDistPath}`);
    await fastify.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
      wildcard: false
    });

    fastify.setNotFoundHandler((req, reply) => {
      const url = req.raw.url || '';
      if (!url.startsWith('/api') && !url.startsWith('/ws') && !url.startsWith('/health')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not Found' });
    });
  }

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Living Civilization Game Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful process cleanup
process.on('SIGINT', () => {
  fastify.log.info('Shutting down game server...');
  gameEngine.stop();
  persistence.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  fastify.log.info('Shutting down game server...');
  gameEngine.stop();
  persistence.close();
  process.exit(0);
});

bootstrap();
