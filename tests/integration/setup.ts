/**
 * 集成测试工具类 - 与 Mock Hub Server 交互
 */
import http from "node:http";
import {
  createMockHub,
  getToolResults,
  resetToolResults,
  WEBHOOK_SECRET,
  APP_TOKEN,
  INSTALLATION_ID,
  BOT_ID,
} from "./mock-hub.js";

/** Mock Server 端口配置 */
export const MOCK_HUB_PORT = 9831;
export const MOCK_HUB_URL = `http://localhost:${MOCK_HUB_PORT}`;
export const MOCK_APP_TOKEN = APP_TOKEN;
export const MOCK_WEBHOOK_SECRET = WEBHOOK_SECRET;
export const MOCK_INSTALLATION_ID = INSTALLATION_ID;
export const MOCK_BOT_ID = BOT_ID;

/** App 的 webhook 端口和地址 */
export const APP_PORT = 9832;
export const APP_WEBHOOK_URL = `http://localhost:${APP_PORT}/hub/webhook`;

/**
 * 启动 Mock Hub Server 实例
 */
export function startMockHub(): Promise<{
  server: http.Server;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const server = createMockHub(MOCK_HUB_PORT, APP_WEBHOOK_URL);
    server.on("error", reject);
    server.listen(MOCK_HUB_PORT, () => {
      console.log(`[setup] Mock Hub Server 已启动，端口 ${MOCK_HUB_PORT}`);
      resolve({
        server,
        close: () =>
          new Promise<void>((res) =>
            server.close(() => {
              console.log("[setup] Mock Hub Server 已关闭");
              res();
            }),
          ),
      });
    });
  });
}

/**
 * 向 Mock Hub 注入一个 command 事件
 * Mock Hub 会将该事件推送给 App 的 webhook
 */
export async function injectCommand(
  command: string,
  args: Record<string, unknown> = {},
  userId = "test_user",
): Promise<string> {
  const res = await fetch(`${MOCK_HUB_URL}/mock/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, args, user_id: userId }),
  });
  if (!res.ok) {
    throw new Error(`注入命令失败: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { trace_id: string };
  return data.trace_id;
}

/**
 * 获取 App 回传到 Mock Hub 的工具结果列表
 */
export function getResults(): Array<{ traceId: string; result: string }> {
  return getToolResults();
}

/**
 * 重置 Mock Hub 状态
 */
export function resetMock(): void {
  resetToolResults();
}

/**
 * 等待条件满足（轮询）
 * @param fn - 条件判断函数
 * @param timeoutMs - 超时时间，默认 10 秒
 * @param intervalMs - 轮询间隔，默认 200 毫秒
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  timeoutMs = 10_000,
  intervalMs = 200,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`等待超时：${timeoutMs}ms 内条件未满足`);
}
