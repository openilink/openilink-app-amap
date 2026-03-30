/**
 * 应用主入口 — 高德地图 OpeniLink Hub App
 *
 * 初始化流程：
 * 1. 加载配置 → 创建 Store → 创建 AmapClient
 * 2. 收集所有工具 → 创建 Router
 * 3. 启动 HTTP Server，注册路由
 * 4. 监听 SIGINT/SIGTERM 优雅关闭
 */

import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { AmapClient } from "./amap/client.js";
import { collectAllTools } from "./tools/index.js";
import { Router } from "./router.js";
import { handleWebhook } from "./hub/webhook.js";
import { handleOAuthStart, handleOAuthCallback } from "./hub/oauth.js";
import { manifest } from "./hub/manifest.js";
import { HubClient } from "./hub/client.js";
import type { HubEvent, Installation } from "./hub/types.js";

// ─── 初始化 ────────────────────────────────────────────────

const config = loadConfig();
const store = new Store(config.dbPath);
const amapClient = new AmapClient(config.amapKey);

console.log(`[app] 启动 ${manifest.name} (${manifest.slug})`);
console.log(`[app] Hub: ${config.hubUrl}`);
console.log(`[app] 回调地址: ${config.baseUrl}`);

// 收集所有 AI Tools 并创建路由器
const { definitions, handlers } = collectAllTools(amapClient);
const router = new Router({ definitions, handlers, store });
console.log(`[app] 已注册 ${definitions.length} 个工具`);

// ─── Hub 事件处理 ─────────────────────────────────────────

/** 获取 HubClient 实例（用于异步回复等场景） */
function getHubClient(installation: Installation): HubClient {
  return new HubClient(installation.hubUrl, installation.appToken);
}

/**
 * 处理 command 事件（同步/异步超时由 webhook 层控制）
 * 从本地加密存储读取 per-installation 配置，动态创建对应的 AmapClient
 * 返回工具执行结果文本，null 表示无需回复
 */
async function onCommand(event: HubEvent, installation: Installation): Promise<string | null> {
  console.log(`[event] 收到 command 事件: id=${event.event?.id}, trace=${event.trace_id}`);

  // 从加密存储读取 per-installation 配置
  const localConfig = store.getConfig(installation.id);
  const key = localConfig.amap_key || config.amapKey;

  // 动态创建对应 installation 的 AmapClient 和 Router
  const instAmapClient = new AmapClient(key);
  const instTools = collectAllTools(instAmapClient);
  const instRouter = new Router({ definitions: instTools.definitions, handlers: instTools.handlers, store });

  const result = await instRouter.handleCommand(event);
  return result ?? null;
}

// ─── HTTP Server ──────────────────────────────────────────

const oauthOpts = { config, store, tools: definitions };

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    // POST /hub/webhook — 接收 Hub 推送事件
    if (pathname === "/hub/webhook" && req.method === "POST") {
      await handleWebhook(req, res, { store, onCommand, getHubClient });
      return;
    }

    // GET /oauth/setup — 启动 OAuth 安装流程
    if (pathname === "/oauth/setup" && req.method === "GET") {
      handleOAuthStart(req, res, oauthOpts);
      return;
    }

    // GET /oauth/redirect — OAuth 回调
    if (pathname === "/oauth/redirect" && req.method === "GET") {
      await handleOAuthCallback(req, res, oauthOpts);
      return;
    }

    // POST /oauth/redirect — 模式 2: Hub 直接安装通知
    if (pathname === "/oauth/redirect" && req.method === "POST") {
      const body = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
      const data = JSON.parse(body.toString());
      store.saveInstallation({
        id: data.installation_id,
        hubUrl: data.hub_url || config.hubUrl,
        appId: "",
        botId: data.bot_id || "",
        appToken: data.app_token,
        webhookSecret: data.webhook_secret,
        createdAt: new Date().toISOString(),
      });
      console.log("[oauth] 模式2安装成功, installation_id:", data.installation_id);
      // 安装后从 Hub 拉取用户配置并加密存储
      const mode2HubClient = new HubClient(data.hub_url || config.hubUrl, data.app_token);
      mode2HubClient.fetchConfig().then((userConfig) => {
        if (Object.keys(userConfig).length > 0) {
          store.saveConfig(data.installation_id, userConfig);
          console.log("[oauth] 模式2用户配置已加密存储");
        }
      }).catch((err) => console.error("[oauth] 模式2拉取配置失败:", err));
      // 异步同步工具定义到 Hub
      mode2HubClient
        .syncTools(definitions)
        .catch((err) => console.error("[oauth] 模式2同步工具失败:", err));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ webhook_url: `${config.baseUrl}/hub/webhook` }));
      return;
    }

    // GET /manifest.json — 返回应用清单（含工具定义）
    if (pathname === "/manifest.json" && req.method === "GET") {
      const body = {
        ...manifest,
        tools: definitions,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body, null, 2));
      return;
    }

    // GET /health — 健康检查
    if (pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", tools: definitions.length }));
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  } catch (err) {
    console.error("[http] 请求处理异常:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
}

const server = createServer((req, res) => {
  requestHandler(req, res).catch((err) => {
    console.error("[http] 未捕获异常:", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end();
    }
  });
});

server.listen(Number(config.port), () => {
  console.log(`[app] 服务已启动，监听端口 ${config.port}`);
  console.log(`[app] 路由: POST /hub/webhook | GET /oauth/setup | GET /oauth/redirect | GET /manifest.json | GET /health`);

  // 启动时同步工具定义到所有已安装的 Hub 实例
  const installations = store.getAllInstallations();
  for (const inst of installations) {
    const hubClient = new HubClient(inst.hubUrl, inst.appToken);
    hubClient.syncTools(definitions).catch((err) => {
      console.error(`[app] 启动同步工具失败 (installation=${inst.id}):`, err);
    });
  }
  if (installations.length > 0) {
    console.log(`[app] 正在向 ${installations.length} 个安装实例同步工具定义`);
  }
});

// ─── 优雅关闭 ─────────────────────────────────────────────

function shutdown(signal: string): void {
  console.log(`\n[app] 收到 ${signal}，正在关闭服务...`);

  // 关闭数据库
  store.close();

  // 关闭 HTTP Server
  server.close(() => {
    console.log("[app] 服务已关闭");
    process.exit(0);
  });

  // 超时强制退出
  setTimeout(() => {
    console.error("[app] 关闭超时，强制退出");
    process.exit(1);
  }, 10_000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
