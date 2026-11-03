# HexColony

Original multiplayer hex strategy game (Node + WebSockets, vanilla JS client). Includes a Cities & Knights mode, a large 37-hex board and piece customisation.

## Run locally
    npm install && npm start     # http://localhost:3000  (PORT env overrides)
    npm test

## Host it so friends can join (real multiplayer)
The server serves the client and the WebSocket on one port, so any Node or Docker host works.

- **Render / Railway:** new Web Service from this folder, build `npm install`, start `npm start`.
- **Fly.io:** `fly launch` (uses the Dockerfile), then `fly deploy`.
- Use a host that supports WebSockets and keep one instance (rooms live in memory).

Not included yet: accounts, ranked ratings, replays, Seafarers, 5-6 player boards.

## Install as an app (Edge / Chrome)
Run the server (`start-windows.bat`), open http://localhost:3000 in Edge, then ⋯ menu → Apps → "Install this site as an app".
HexColony then gets its own window, Start-menu entry and taskbar icon. The server must still be running to play.
