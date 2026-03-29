/**
 * Mock Hub Server — 模拟 OpeniLink Hub 用于集成测试
 *
 * 功能：
 * 1. 接收 App 注册的工具（PUT /api/bot/tools）
 * 2. 接收 App 回传的工具结果（POST /api/bot/tool-result）
 * 3. 模拟事件注入，将事件推送到 App webhook（POST /mock/event）
 * 4. 健康检查（GET /health）
 */

import http from "node:http";
import { createHmac } from "node:crypto";

/** 常量配置 */
export const WEBHOOK_SECRET = "test_webhook_secret_123";
export const APP_TOKEN = "test_app_token_456";
export const INSTALLATION_ID = "test_inst_001";
export const BOT_ID = "test_bot_001";

/** 收到的工具执行结果 */
let toolResults: Array<{ traceId: string; result: string }> = [];

/** 获取工具执行结果 */
export function getToolResults(): typeof toolResults {
  return toolResults;
}

/** 重置收集的数据 */
export function resetToolResults(): void {
  toolResults = [];
}

/**
 * 创建 Mock Hub Server
 * @param port - 监听端口
 * @param appWebhookUrl - App 的 webhook 地址
 */
export function createMockHub(port: number, appWebhookUrl: string): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${port}`);
    const pathname = url.pathname;

    // 读取请求体
    const body = await readBody(req);

    // GET /health — 健康检查
    if (pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // PUT /api/bot/tools — 注册工具
    if (pathname === "/api/bot/tools" && req.method === "PUT") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // POST /api/bot/tool-result — 接收工具结果
    if (pathname === "/api/bot/tool-result" && req.method === "POST") {
      const data = JSON.parse(body);
      toolResults.push({ traceId: data.trace_id, result: data.result });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // POST /api/bot/message — 接收消息
    if (pathname === "/api/bot/message" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { messageId: "mock_msg_001" } }));
      return;
    }

    // POST /mock/event — 模拟注入事件（测试专用）
    if (pathname === "/mock/event" && req.method === "POST") {
      const data = JSON.parse(body);

      // 构建 Hub 事件
      const hubEvent = {
        v: "1",
        type: "event",
        trace_id: `trace_${Date.now()}`,
        installation_id: INSTALLATION_ID,
        bot: { id: BOT_ID },
        event: {
          type: "command",
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          data: {
            command: data.command,
            args: data.args || {},
            user_id: data.user_id || "test_user",
          },
        },
      };

      const eventBody = JSON.stringify(hubEvent);
      const signature = createHmac("sha256", WEBHOOK_SECRET).update(eventBody).digest("hex");

      // 推送到 App webhook
      try {
        const webhookResp = await fetch(appWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature": signature,
          },
          body: eventBody,
        });

        if (!webhookResp.ok) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `webhook 返回 ${webhookResp.status}` }));
          return;
        }
      } catch (err: any) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, trace_id: hubEvent.trace_id }));
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  return server;
}

/** 读取请求体 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
