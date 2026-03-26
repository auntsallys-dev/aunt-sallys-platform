// In-memory WebSocket channel manager
const channels = new Map<string, Set<any>>();

export const wsManager = {
  subscribe(channel: string, ws: any) {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel)!.add(ws);
  },

  unsubscribe(channel: string, ws: any) {
    const set = channels.get(channel);
    if (set) {
      set.delete(ws);
      if (set.size === 0) channels.delete(channel);
    }
  },

  broadcast(channel: string, data: unknown) {
    const clients = channels.get(channel);
    if (!clients || clients.size === 0) return;
    const msg = JSON.stringify(data);
    for (const ws of clients) {
      try {
        ws.send(msg);
      } catch {
        // client disconnected — will be cleaned up on close
      }
    }
  },

  channelSize(channel: string): number {
    return channels.get(channel)?.size ?? 0;
  },
};
