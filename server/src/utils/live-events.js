const MAX_CONNECTIONS_PER_IP = 5;
const HEARTBEAT_MS = 25_000;
const clients = new Set();
const connectionsByIp = new Map();

function subscribeToLiveEvents(req, res) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const activeCount = connectionsByIp.get(clientIp) || 0;

  if (activeCount >= MAX_CONNECTIONS_PER_IP) {
    return res.status(429).json({ message: 'เปิดการเชื่อมต่อสดจากเครือข่ายนี้มากเกินไป' });
  }

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');

  const client = { clientIp, res, cleanup: null };
  clients.add(client);
  connectionsByIp.set(clientIp, activeCount + 1);

  const heartbeat = setInterval(() => {
    if (!res.destroyed) res.write(': keep-alive\n\n');
  }, HEARTBEAT_MS);

  const cleanup = () => {
    clearInterval(heartbeat);
    if (!clients.delete(client)) return;
    const remaining = (connectionsByIp.get(clientIp) || 1) - 1;
    if (remaining > 0) connectionsByIp.set(clientIp, remaining);
    else connectionsByIp.delete(clientIp);
  };
  client.cleanup = cleanup;

  res.on('close', cleanup);
  res.on('error', cleanup);
}

function publishLiveUpdate() {
  const event = `event: data-updated\ndata: {"updatedAt":"${new Date().toISOString()}"}\n\n`;
  for (const client of clients) {
    if (client.res.destroyed || client.res.writableEnded) {
      client.cleanup();
      continue;
    }

    try {
      client.res.write(event);
    } catch (error) {
      client.res.destroy();
    }
  }
}

module.exports = { subscribeToLiveEvents, publishLiveUpdate };
