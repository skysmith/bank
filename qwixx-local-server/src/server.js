import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { customAlphabet } from 'nanoid';

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const ORIGIN = process.env.CORS_ORIGIN || '*';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map();

function ensureRoom(code){
  if (!rooms.has(code)){
    rooms.set(code, {
      state: null,
      version: 0,
      clients: new Set()
    });
  }
  return rooms.get(code);
}

function broadcast(code, payload){
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(payload);
  room.clients.forEach((socket) => {
    if (socket.readyState === socket.OPEN){
      socket.send(data);
    }
  });
}

const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/rooms', (req, res) => {
  const { code = nanoid(), state } = req.body || {};
  if (!state) return res.status(400).json({ error: 'state required' });
  const room = ensureRoom(code);
  room.state = state;
  room.version = 1;
  broadcast(code, { type: 'sync', version: room.version, state: room.state });
  res.json({ code, version: room.version });
});

app.get('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room || !room.state) return res.status(404).json({ error: 'not found' });
  res.json({ version: room.version, state: room.state });
});

app.put('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  const { state, version } = req.body || {};
  if (!state || typeof version !== 'number'){
    return res.status(400).json({ error: 'state + version required' });
  }
  const room = ensureRoom(code);
  if (!room.state){
    room.state = state;
    room.version = version;
  }
  if (version < room.version){
    return res.status(409).json({ error: 'version_mismatch', version: room.version, state: room.state });
  }
  room.state = state;
  room.version = version + 1;
  broadcast(code, { type: 'sync', version: room.version, state: room.state });
  res.json({ version: room.version });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');
  if (!code){
    socket.close(1008, 'code required');
    return;
  }
  const room = ensureRoom(code);
  room.clients.add(socket);

  if (room.state){
    socket.send(JSON.stringify({ type: 'sync', version: room.version, state: room.state }));
  }

  socket.on('close', () => {
    room.clients.delete(socket);
    if (room.clients.size === 0 && !room.state){
      rooms.delete(code);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`qwixx local server running at http://${HOST}:${PORT}`);
});
