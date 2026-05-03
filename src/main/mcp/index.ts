import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { TodoService } from '../services/todoService';
import type { CalendarService } from '../services/calendarService';
import type { Store } from 'electron-store';
import type { Logger } from 'electron-log';
import { registerTools } from './tools';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

function setCors(res: import('express').Response) {
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.setHeader(k, v);
  }
}

export class McpServerService {
  private store: Store;
  private logger: Logger;
  private todoService: TodoService;
  private calendarService: CalendarService;
  private httpServer: import('http').Server | null = null;
  private streamableTransports: Map<string, StreamableHTTPServerTransport> = new Map();
  private sseTransports: Map<string, SSEServerTransport> = new Map();

  constructor(
    store: Store,
    logger: Logger,
    todoService: TodoService,
    calendarService: CalendarService
  ) {
    this.store = store;
    this.logger = logger;
    this.todoService = todoService;
    this.calendarService = calendarService;
  }

  private createMcpServer(): McpServer {
    const server = new McpServer({ name: 'todo-notes-mcp', version: '1.0.0' });
    registerTools(server, this.todoService, this.calendarService);
    return server;
  }

  start(): void {
    const enabled = this.store.get('app.settings.enableMcpServer', false) as boolean;
    if (!enabled) {
      this.logger.info('MCP 服务未启用');
      return;
    }

    const port = this.store.get('app.settings.mcpPort', 3000) as number;
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      this.logger.warn(`MCP 端口无效: ${port}，使用默认端口 3000`);
    }
    const safePort = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : 3000;
    const apiKey = this.store.get('app.settings.mcpApiKey', '') as string;
    const app = createMcpExpressApp({ host: '127.0.0.1' });

    // CORS 预检
    app.options(['/mcp', '/sse'], (_req, res) => {
      setCors(res);
      res.status(204).end();
    });

    app.use(['/mcp', '/sse'], (_req, res, next) => {
      setCors(res);
      next();
    });

    // 可选鉴权
    if (apiKey) {
      app.use(['/mcp', '/sse'], (req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth || auth !== `Bearer ${apiKey}`) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      });
    }

    // ===== Streamable HTTP 端点 (/mcp) =====

    app.post('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (sessionId && this.streamableTransports.has(sessionId)) {
          await this.streamableTransports.get(sessionId)!.handleRequest(req as any, res as any, req.body);
          return;
        }

        if (!sessionId && isInitializeRequest(req.body)) {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              this.logger.info(`Streamable HTTP 会话已建立: ${sid}`);
              this.streamableTransports.set(sid, transport);
            },
          });
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) this.streamableTransports.delete(sid);
          };
          await this.createMcpServer().connect(transport);
          await transport.handleRequest(req as any, res as any, req.body);
          return;
        }

        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: (req.body as any)?.id ?? null,
        });
      } catch (err) {
        this.logger.error(`MCP POST 处理失败: ${err}`);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    });

    app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !this.streamableTransports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      await this.streamableTransports.get(sessionId)!.handleRequest(req as any, res as any);
    });

    app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !this.streamableTransports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      try {
        await this.streamableTransports.get(sessionId)!.handleRequest(req as any, res as any);
      } catch (err) {
        this.logger.error(`MCP DELETE 处理失败: ${err}`);
        if (!res.headersSent) res.status(500).send('Error processing session termination');
      }
    });

    // ===== SSE 兼容端点 (/sse) =====

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/messages', res as any);
      const sessionId = transport.sessionId;
      this.sseTransports.set(sessionId, transport);
      this.logger.info(`SSE 会话已建立: ${sessionId}`);

      transport.onclose = () => {
        this.sseTransports.delete(sessionId);
        this.logger.info(`SSE 会话已关闭: ${sessionId}`);
      };

      await this.createMcpServer().connect(transport);
    });

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string | undefined;
      if (!sessionId || !this.sseTransports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      const transport = this.sseTransports.get(sessionId)!;
      await transport.handlePostMessage(req as any, res as any, req.body);
    });

    this.httpServer = app.listen(safePort, '127.0.0.1', () => {
      this.logger.info(`MCP 服务已启动: http://127.0.0.1:${safePort}/mcp (Streamable HTTP) /sse (SSE)`););
    });
  }

  async stop(): Promise<void> {
    for (const [, t] of this.streamableTransports) await t.close();
    for (const [, t] of this.sseTransports) await t.close();
    this.streamableTransports.clear();
    this.sseTransports.clear();
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    this.logger.info('MCP 服务已停止');
  }

  async restart(): Promise<void> {
    await this.stop();
    this.start();
  }
}
