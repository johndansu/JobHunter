import { WebSocketServer } from 'ws';
import { Server } from 'http';

interface WebSocketClient {
  ws: any;
  userId?: string;
  isAlive: boolean;
}

const clients = new Map<string, WebSocketClient>();

export const setupWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    const client: WebSocketClient = {
      ws,
      isAlive: true
    };
    
    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${clientId}`);

    // Handle pong responses
    ws.on('pong', () => {
      client.isAlive = true;
    });

    // Handle authentication
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.token) {
          // Verify JWT token and set userId
          const jwt = require('jsonwebtoken');
          try {
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            client.userId = decoded.userId;
            console.log(`Client ${clientId} authenticated as user ${decoded.userId}`);
          } catch (error) {
            console.log(`Invalid token for client ${clientId}`);
          }
        }
      } catch (error) {
        console.log(`Invalid message from client ${clientId}:`, error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.log(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  // Ping clients every 30 seconds to check if they're alive
  const interval = setInterval(() => {
    clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(clientId);
        return;
      }
      
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  // Cleanup on server shutdown
  server.on('close', () => {
    clearInterval(interval);
  });
};

export const broadcastToUser = (userId: string, message: any) => {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

export const broadcastToAll = (message: any) => {
  clients.forEach((client) => {
    if (client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

// Real-time monitoring functions
export const broadcastJobUpdate = (userId: string, jobUpdate: any) => {
  broadcastToUser(userId, {
    type: 'job_update',
    data: jobUpdate,
    timestamp: new Date().toISOString()
  });
};

export const broadcastJobProgress = (userId: string, jobId: string, progress: any) => {
  broadcastToUser(userId, {
    type: 'job_progress',
    data: {
      jobId,
      ...progress
    },
    timestamp: new Date().toISOString()
  });
};

export const broadcastSystemStats = (stats: any) => {
  broadcastToAll({
    type: 'system_stats',
    data: stats,
    timestamp: new Date().toISOString()
  });
};

export const broadcastDataUpdate = (userId: string, dataUpdate: any) => {
  broadcastToUser(userId, {
    type: 'data_update',
    data: dataUpdate,
    timestamp: new Date().toISOString()
  });
};

export const broadcastNotification = (userId: string, notification: any) => {
  broadcastToUser(userId, {
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString()
  });
};

export const getConnectedClients = () => {
  return Array.from(clients.entries()).map(([id, client]) => ({
    id,
    userId: client.userId,
    isAlive: client.isAlive
  }));
};