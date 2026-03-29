/**
 * 搜索工具测试
 */
import { describe, it, expect, vi } from "vitest";
import { searchTools } from "../../src/tools/search.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的 AmapClient */
function mockAmapClient() {
  return {
    geocode: vi.fn(),
    reverseGeocode: vi.fn(),
    searchPOI: vi.fn().mockResolvedValue({
      status: "1",
      pois: [
        {
          name: "海底捞火锅(望京店)",
          address: "北京市朝阳区望京街10号",
          tel: "010-12345678",
          location: "116.481028,39.989643",
          type: "餐饮服务;中餐厅;火锅店",
        },
        {
          name: "小龙坎火锅(望京店)",
          address: "北京市朝阳区望京西路",
          tel: "010-87654321",
          location: "116.480000,39.988000",
          type: "餐饮服务;中餐厅;火锅店",
        },
      ],
    }),
    searchAround: vi.fn().mockResolvedValue({
      status: "1",
      pois: [
        {
          name: "星巴克(方恒店)",
          address: "朝阳区阜通东大街6号方恒国际中心",
          distance: "120",
          location: "116.481500,39.989800",
        },
      ],
    }),
    drivingRoute: vi.fn(),
    walkingRoute: vi.fn(),
    transitRoute: vi.fn(),
    weather: vi.fn(),
    ipLocation: vi.fn(),
    distance: vi.fn(),
  } as any;
}

/** 构建 ToolContext */
function makeCtx(args: Record<string, unknown>): ToolContext {
  return {
    installationId: "inst-001",
    botId: "bot-001",
    userId: "user-001",
    traceId: "trace-001",
    args,
  };
}

describe("searchTools", () => {
  it("定义了 2 个工具", () => {
    expect(searchTools.definitions).toHaveLength(2);
    expect(searchTools.definitions[0].name).toBe("search_poi");
    expect(searchTools.definitions[1].name).toBe("search_around");
  });

  describe("search_poi", () => {
    it("成功搜索并返回格式化结果", async () => {
      const client = mockAmapClient();
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_poi")!;

      const result = await handler(makeCtx({ keywords: "火锅", city: "北京" }));

      expect(result).toContain("2 个结果");
      expect(result).toContain("海底捞");
      expect(result).toContain("小龙坎");
      expect(result).toContain("北京");
    });

    it("缺少 keywords 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_poi")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("错误");
      expect(result).toContain("keywords");
    });

    it("无结果时返回提示", async () => {
      const client = mockAmapClient();
      client.searchPOI.mockResolvedValue({ status: "1", pois: [] });
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_poi")!;

      const result = await handler(makeCtx({ keywords: "不存在的地方" }));
      expect(result).toContain("未找到");
    });

    it("API 异常时返回错误信息", async () => {
      const client = mockAmapClient();
      client.searchPOI.mockRejectedValue(new Error("高德 API 限流"));
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_poi")!;

      const result = await handler(makeCtx({ keywords: "test" }));
      expect(result).toContain("失败");
      expect(result).toContain("高德 API 限流");
    });
  });

  describe("search_around", () => {
    it("成功搜索周边并返回结果", async () => {
      const client = mockAmapClient();
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_around")!;

      const result = await handler(makeCtx({ location: "116.481028,39.989643", keywords: "咖啡" }));

      expect(result).toContain("星巴克");
      expect(result).toContain("120米");
    });

    it("缺少 location 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = searchTools.createHandlers(client);
      const handler = handlers.get("search_around")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("错误");
      expect(result).toContain("location");
    });
  });
});
