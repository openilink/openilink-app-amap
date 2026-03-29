/**
 * Webhook 处理器测试
 */
import { describe, it, expect, vi } from "vitest";
import { handleWebhook } from "../../src/hub/webhook.js";
import { createHmac } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";

/** 创建模拟的 Store */
function mockStore(installation?: any) {
  return {
    getInstallation: vi.fn().mockReturnValue(installation),
    saveInstallation: vi.fn(),
    getAllInstallations: vi.fn().mockReturnValue([]),
    close: vi.fn(),
  } as any;
}

/** 创建模拟的 IncomingMessage */
function mockReq(method: string, body: string, headers: Record<string, string> = {}): IncomingMessage {
  const emitter = new EventEmitter() as IncomingMessage;
  emitter.method = method;
  emitter.headers = headers;
  // 模拟数据流
  setTimeout(() => {
    emitter.emit("data", Buffer.from(body));
    emitter.emit("end");
  }, 0);
  return emitter;
}

/** 创建模拟的 ServerResponse */
function mockRes(): ServerResponse & { _status: number; _body: string } {
  const res = {
    _status: 0,
    _body: "",
    headersSent: false,
    writeHead(status: number) {
      res._status = status;
      return res;
    },
    end(body?: string) {
      res._body = body || "";
      res.headersSent = true;
    },
  } as any;
  return res;
}

/** 测试用的安装实例 */
const testInstallation = {
  id: "inst-001",
  hubUrl: "https://hub.example.com",
  appId: "app-001",
  botId: "bot-001",
  appToken: "token-001",
  webhookSecret: "secret-001",
};

/** 对请求体签名 */
function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("handleWebhook", () => {
  it("非 POST 请求返回 405", async () => {
    const req = mockReq("GET", "");
    req.method = "GET";
    const res = mockRes();
    const store = mockStore();

    await handleWebhook(req, res, { store });

    expect(res._status).toBe(405);
  });

  it("未知安装实例返回 404", async () => {
    const body = JSON.stringify({ installation_id: "unknown", type: "event", v: "1", trace_id: "t1", bot: { id: "b1" } });
    const req = mockReq("POST", body);
    const res = mockRes();
    const store = mockStore(undefined);

    await handleWebhook(req, res, { store });

    expect(res._status).toBe(404);
  });

  it("签名验证失败返回 401", async () => {
    const body = JSON.stringify({
      installation_id: "inst-001",
      type: "event",
      v: "1",
      trace_id: "t1",
      bot: { id: "b1" },
    });
    const req = mockReq("POST", body, { "x-hub-signature": "invalid" });
    const res = mockRes();
    const store = mockStore(testInstallation);

    await handleWebhook(req, res, { store });

    expect(res._status).toBe(401);
  });

  it("challenge 握手返回正确响应", async () => {
    const event = {
      v: "1",
      type: "challenge",
      challenge: "test_challenge_123",
      trace_id: "t1",
      installation_id: "inst-001",
      bot: { id: "b1" },
    };
    const body = JSON.stringify(event);
    const sig = sign(body, testInstallation.webhookSecret);
    const req = mockReq("POST", body, { "x-hub-signature": sig });
    const res = mockRes();
    const store = mockStore(testInstallation);

    await handleWebhook(req, res, { store });

    expect(res._status).toBe(200);
    expect(JSON.parse(res._body)).toEqual({ challenge: "test_challenge_123" });
  });

  it("正常事件分发到 onEvent 回调", async () => {
    const event = {
      v: "1",
      type: "event",
      trace_id: "t1",
      installation_id: "inst-001",
      bot: { id: "b1" },
      event: { type: "command", id: "e1", timestamp: "2025-01-01", data: {} },
    };
    const body = JSON.stringify(event);
    const sig = sign(body, testInstallation.webhookSecret);
    const req = mockReq("POST", body, { "x-hub-signature": sig });
    const res = mockRes();
    const store = mockStore(testInstallation);
    const onEvent = vi.fn().mockResolvedValue(undefined);

    await handleWebhook(req, res, { store, onEvent });

    expect(res._status).toBe(200);
    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent.mock.calls[0][0].trace_id).toBe("t1");
  });
});
