# Qwixx Local Server

Lightweight Express + WebSocket relay so you can host multiplayer Qwixx games on your LAN without Supabase.

## Features
- In-memory room store (code + JSON state + version)
- REST endpoints for create/fetch/update rooms
- WebSocket feed that broadcasts `sync` messages to all clients in a room
- CORS + configurable port/host

## Usage
```bash
cd qwixx-local-server
npm install
npm run start   # listens on http://0.0.0.0:4000 by default
```

Environment variables:
- `PORT` (default 4000)
- `HOST` (default `0.0.0.0`)
- `CORS_ORIGIN` (default `*`)

## API sketch
- `POST /api/rooms` `{ code?, state }` → `{ code, version }`
- `GET /api/rooms/:code` → `{ state, version }`
- `PUT /api/rooms/:code` `{ state, version }` → `{ version }`
- `GET /health` → `{ ok: true }`
- `WS /ws?code=ROOM` → server pushes `{ type: "sync", version, state }`

## Integration notes
1. Host runs this server on the same machine as the Vite dev server (or any LAN box).
2. Update the Qwixx client to use `fetch('http://<host>:4000/api/rooms/...')` plus a WebSocket subscriber instead of Supabase when `VITE_QWIXX_BACKEND=local`.
3. Because the store is in-memory, restarting the server clears rooms. Persist to disk later if needed.

Feel free to expand with auth, disk persistence, or a public websocket path if you want remote friends to tunnel in.
