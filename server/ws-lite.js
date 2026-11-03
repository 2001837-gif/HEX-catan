'use strict';
// Minimal dependency-free RFC 6455 WebSocket server (text frames only).
// Used automatically when the `ws` package is not installed. API subset matches `ws`.
const crypto = require('crypto');
const { EventEmitter } = require('events');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Socket extends EventEmitter {
  constructor(sock, max) {
    super(); this.sock = sock; this.max = max; this.readyState = 1; this.buf = Buffer.alloc(0); this.frag = null;
    sock.on('data', d => { this.buf = Buffer.concat([this.buf, d]); try { this.parse(); } catch (e) { this.terminate(1009); } });
    sock.on('close', () => this.finish()); sock.on('error', () => this.finish());
  }
  finish() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(code) { try { this.sock.end(this.frame(0x8, Buffer.from([code >> 8, code & 255]))); } catch (e) { } this.readyState = 2; this.sock.destroy(); this.finish(); }
  frame(op, payload) {
    const n = payload.length; let h;
    if (n < 126) h = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
    return Buffer.concat([h, payload]);
  }
  send(data) { if (this.readyState !== 1) return; this.sock.write(this.frame(0x1, Buffer.from(String(data)))); }
  close() { if (this.readyState !== 1) return; this.readyState = 2; try { this.sock.end(this.frame(0x8, Buffer.alloc(0))); } catch (e) { } }
  parse() {
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const op = b[0] & 0x0f, fin = !!(b[0] & 0x80), masked = !!(b[1] & 0x80); let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > this.max) throw new Error('too big');
      if (!masked) throw new Error('unmasked');
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (op === 0x8) { this.close(); this.sock.end(); return; }
      if (op === 0x9) { this.sock.write(this.frame(0xA, data)); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2) this.frag = { parts: [data] }; else if (op === 0x0 && this.frag) this.frag.parts.push(data); else continue;
      if (fin) { const msg = Buffer.concat(this.frag.parts).toString('utf8'); this.frag = null; this.emit('message', msg); }
    }
  }
}

class WebSocketServer extends EventEmitter {
  constructor({ server, path, maxPayload = 1 << 20 }) {
    super();
    server.on('upgrade', (req, sock) => {
      const url = req.url.split('?')[0];
      if ((path && url !== path) || (req.headers.upgrade || '').toLowerCase() !== 'websocket' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
      const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
      sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      this.emit('connection', new Socket(sock, maxPayload), req);
    });
  }
}
module.exports = { WebSocketServer };
