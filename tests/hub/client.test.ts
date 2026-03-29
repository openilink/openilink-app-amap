/**
 * Hub 客户端测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HubClient } from "../../src/hub/client.js";

describe("HubClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("构造时移除末尾斜杠", () => {
    const client = new HubClient("https://hub.example.com/", "token");
    // 通过 sendMessage 验证 URL 拼接正确
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: true, data: { messageId: "m1" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    client.sendMessage({ userId: "u1", text: "hello" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hub.example.com/api/bot/message",
      expect.anything(),
    );
  });

  it("sendMessage 发送正确的请求", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: true, data: { messageId: "msg-001" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new HubClient("https://hub.example.com", "test-token");
    const result = await client.sendMessage({ userId: "user1", text: "你好" });

    expect(result).toEqual({ messageId: "msg-001" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hub.example.com/api/bot/message",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("replyToolResult 发送正确的请求", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new HubClient("https://hub.example.com", "token");
    await client.replyToolResult("trace-001", "查询结果...");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.trace_id).toBe("trace-001");
    expect(body.result).toBe("查询结果...");
  });

  it("HTTP 错误时抛出异常", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new HubClient("https://hub.example.com", "token");
    await expect(client.sendMessage({ userId: "u1", text: "test" })).rejects.toThrow("500");
  });

  it("业务错误时抛出异常", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: false, error: "token 过期" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new HubClient("https://hub.example.com", "token");
    await expect(client.sendMessage({ userId: "u1", text: "test" })).rejects.toThrow("token 过期");
  });
});
