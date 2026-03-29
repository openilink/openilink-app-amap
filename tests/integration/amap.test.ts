/**
 * 高德地图 App 集成测试
 *
 * 测试 Hub <-> App 的完整通信链路：
 * 1. Mock Hub Server 模拟 OpeniLink Hub
 * 2. 创建轻量 App HTTP 服务器（webhook + manifest + health）
 * 3. Mock AmapClient 模拟高德 API
 * 4. 验证 command 事件能正确调用对应 Tool 并回传结果
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import { Store } from "../../src/store.js";
import { handleWebhook } from "../../src/hub/webhook.js";
import { collectAllTools } from "../../src/tools/index.js";
import { Router } from "../../src/router.js";
import { HubClient } from "../../src/hub/client.js";
import type { HubEvent } from "../../src/hub/types.js";
import {
  startMockHub,
  injectCommand,
  getResults,
  resetMock,
  waitFor,
  MOCK_HUB_URL,
  MOCK_WEBHOOK_SECRET,
  MOCK_APP_TOKEN,
  MOCK_INSTALLATION_ID,
  MOCK_BOT_ID,
  APP_PORT,
} from "./setup.js";

// ─── Mock AmapClient ───

function createMockAmapClient() {
  return {
    geocode: async (address: string, _city?: string) => ({
      status: "1",
      geocodes: [
        {
          formatted_address: address,
          location: "116.481028,39.989643",
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          level: "门牌号",
        },
      ],
    }),
    reverseGeocode: async (_location: string) => ({
      status: "1",
      regeocode: {
        formatted_address: "北京市朝阳区望京街道",
        addressComponent: {
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          adcode: "110105",
          streetNumber: { street: "望京街", number: "10号" },
        },
      },
    }),
    searchPOI: async (keywords: string) => ({
      status: "1",
      pois: [
        {
          name: `${keywords}测试店铺`,
          address: "测试地址",
          tel: "010-12345678",
          location: "116.481028,39.989643",
          type: "测试类型",
        },
      ],
    }),
    searchAround: async () => ({
      status: "1",
      pois: [{ name: "附近餐厅", address: "测试地址", distance: "200" }],
    }),
    drivingRoute: async () => ({
      status: "1",
      route: {
        paths: [
          {
            distance: "10000",
            duration: "1200",
            tolls: "0",
            steps: [{ instruction: "直行1公里" }],
          },
        ],
      },
    }),
    walkingRoute: async () => ({
      status: "1",
      route: {
        paths: [
          {
            distance: "500",
            duration: "360",
            steps: [{ instruction: "步行500米" }],
          },
        ],
      },
    }),
    transitRoute: async () => ({
      status: "1",
      route: {
        transits: [
          {
            distance: "8000",
            duration: "1800",
            cost: "4",
            walking_distance: "500",
            segments: [],
          },
        ],
      },
    }),
    weather: async (_city: string, extensions: string) => {
      if (extensions === "base") {
        return {
          status: "1",
          lives: [
            {
              province: "测试省",
              city: "测试市",
              weather: "晴",
              temperature: "25",
              winddirection: "南",
              windpower: "3",
              humidity: "50",
              reporttime: "2025-07-01 14:00:00",
            },
          ],
        };
      }
      return {
        status: "1",
        forecasts: [
          {
            city: "测试市",
            casts: [
              {
                date: "2025-07-01",
                week: "2",
                dayweather: "晴",
                nightweather: "多云",
                daytemp: "30",
                nighttemp: "20",
                daywind: "南",
                nightwind: "北",
                daypower: "3",
                nightpower: "2",
              },
            ],
          },
        ],
      };
    },
    ipLocation: async () => ({
      status: "1",
      province: "北京市",
      city: "北京市",
      adcode: "110000",
    }),
    distance: async () => ({
      status: "1",
      results: [{ distance: "5000", duration: "600" }],
    }),
  } as any;
}

// ─── 测试主体 ───

describe("高德地图 App 集成测试", () => {
  let mockHubHandle: { server: http.Server; close: () => Promise<void> };
  let appServer: http.Server;
  let store: Store;

  beforeAll(async () => {
    // 1. 启动 Mock Hub Server
    mockHubHandle = await startMockHub();

    // 2. 初始化内存数据库
    store = new Store(":memory:");

    // 3. 注入 installation 记录（模拟已完成 OAuth）
    store.saveInstallation({
      id: MOCK_INSTALLATION_ID,
      hubUrl: MOCK_HUB_URL,
      appId: "test-app",
      botId: MOCK_BOT_ID,
      appToken: MOCK_APP_TOKEN,
      webhookSecret: MOCK_WEBHOOK_SECRET,
      createdAt: new Date().toISOString(),
    });

    // 4. 创建 Mock AmapClient 和路由器
    const mockAmap = createMockAmapClient();
    const { definitions, handlers } = collectAllTools(mockAmap);
    const router = new Router({ definitions, handlers, store });

    // 5. 启动 App HTTP 服务器
    appServer = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${APP_PORT}`);

      if (url.pathname === "/hub/webhook") {
        await handleWebhook(req, res, {
          store,
          onEvent: async (event: HubEvent) => {
            if (!event.event || event.event.type !== "command") return;

            const installation = store.getInstallation(event.installation_id);
            if (!installation) return;

            const hubClient = new HubClient(installation.hubUrl, installation.appToken);
            await router.handleAndReply(event, hubClient);
          },
        });
        return;
      }

      if (url.pathname === "/manifest.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ slug: "amap", tools: definitions }));
        return;
      }

      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", tools: definitions.length }));
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    await new Promise<void>((resolve, reject) => {
      appServer.on("error", reject);
      appServer.listen(APP_PORT, () => {
        console.log(`[test] App Server 已启动，端口 ${APP_PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) =>
      appServer.close(() => {
        console.log("[test] App Server 已关闭");
        resolve();
      }),
    );
    await mockHubHandle.close();
    store.close();
  });

  beforeEach(() => {
    resetMock();
  });

  // ─── 基础连通性测试 ───

  it("Mock Hub 健康检查", async () => {
    const res = await fetch(`${MOCK_HUB_URL}/health`);
    expect(res.ok).toBe(true);
  });

  it("App 健康检查", async () => {
    const res = await fetch(`http://localhost:${APP_PORT}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.tools).toBe(10);
  });

  it("App manifest 返回工具定义", async () => {
    const res = await fetch(`http://localhost:${APP_PORT}/manifest.json`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as any;
    expect(data.slug).toBe("amap");
    expect(data.tools.length).toBe(10);
  });

  // ─── 工具调用集成测试 ───

  it("geocode 命令完整链路", async () => {
    await injectCommand("geocode", { address: "天安门" });

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("天安门");
    expect(results[0].result).toContain("116.481028");
  });

  it("search_poi 命令完整链路", async () => {
    await injectCommand("search_poi", { keywords: "火锅", city: "北京" });

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("火锅测试店铺");
  });

  it("get_weather 命令完整链路", async () => {
    await injectCommand("get_weather", { city: "北京" });

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("晴");
    expect(results[0].result).toContain("25");
  });

  it("driving_route 命令完整链路", async () => {
    await injectCommand("driving_route", {
      origin: "116.481028,39.989643",
      destination: "116.405285,39.904989",
    });

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("驾车");
    expect(results[0].result).toContain("10.0公里");
  });

  it("未知命令返回错误提示", async () => {
    await injectCommand("nonexistent_command", {});

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("未知命令");
  });

  it("缺少必填参数返回错误提示", async () => {
    await injectCommand("geocode", {});

    await waitFor(async () => getResults().length > 0, 5000);

    const results = getResults();
    expect(results.length).toBe(1);
    expect(results[0].result).toContain("错误");
    expect(results[0].result).toContain("address");
  });

  // ─── Webhook 安全性测试 ───

  it("无效签名的 webhook 请求被拒绝（401）", async () => {
    const hubEvent = {
      v: "1",
      type: "event",
      trace_id: "tr_bad_sig",
      installation_id: MOCK_INSTALLATION_ID,
      bot: { id: MOCK_BOT_ID },
      event: {
        type: "command",
        id: "evt_bad",
        timestamp: new Date().toISOString(),
        data: { command: "geocode", args: { address: "test" }, user_id: "hacker" },
      },
    };

    const res = await fetch(`http://localhost:${APP_PORT}/hub/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": "invalid_signature",
      },
      body: JSON.stringify(hubEvent),
    });

    expect(res.status).toBe(401);
  });

  it("challenge 握手正确响应", async () => {
    const challengeEvent = {
      v: "1",
      type: "challenge",
      challenge: "test_challenge_abc",
      trace_id: "tr_challenge",
      installation_id: MOCK_INSTALLATION_ID,
      bot: { id: MOCK_BOT_ID },
    };

    const bodyStr = JSON.stringify(challengeEvent);
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHmac("sha256", MOCK_WEBHOOK_SECRET)
      .update(bodyStr)
      .digest("hex");

    const res = await fetch(`http://localhost:${APP_PORT}/hub/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": sig,
      },
      body: bodyStr,
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual({ challenge: "test_challenge_abc" });
  });
});
