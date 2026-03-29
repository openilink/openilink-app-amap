/**
 * 地理编码工具测试
 */
import { describe, it, expect, vi } from "vitest";
import { geocodeTools } from "../../src/tools/geocode.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的 AmapClient */
function mockAmapClient() {
  return {
    geocode: vi.fn().mockResolvedValue({
      status: "1",
      geocodes: [
        {
          formatted_address: "北京市朝阳区阜通东大街6号",
          location: "116.481028,39.989643",
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          level: "门牌号",
        },
      ],
    }),
    reverseGeocode: vi.fn().mockResolvedValue({
      status: "1",
      regeocode: {
        formatted_address: "北京市朝阳区望京街道方恒国际中心A座方恒国际中心",
        addressComponent: {
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          adcode: "110105",
          streetNumber: {
            street: "阜通东大街",
            number: "6号",
          },
        },
      },
    }),
    searchPOI: vi.fn(),
    searchAround: vi.fn(),
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

describe("geocodeTools", () => {
  it("定义了 2 个工具", () => {
    expect(geocodeTools.definitions).toHaveLength(2);
    expect(geocodeTools.definitions[0].name).toBe("geocode");
    expect(geocodeTools.definitions[1].name).toBe("reverse_geocode");
  });

  describe("geocode", () => {
    it("成功返回地理编码结果", async () => {
      const client = mockAmapClient();
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("geocode")!;

      const result = await handler(makeCtx({ address: "北京市朝阳区阜通东大街6号" }));

      expect(result).toContain("116.481028,39.989643");
      expect(result).toContain("朝阳区");
      expect(client.geocode).toHaveBeenCalledWith("北京市朝阳区阜通东大街6号", undefined);
    });

    it("支持传入城市参数", async () => {
      const client = mockAmapClient();
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("geocode")!;

      await handler(makeCtx({ address: "阜通东大街6号", city: "北京" }));

      expect(client.geocode).toHaveBeenCalledWith("阜通东大街6号", "北京");
    });

    it("缺少 address 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("geocode")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("错误");
      expect(result).toContain("address");
    });

    it("未找到结果返回提示", async () => {
      const client = mockAmapClient();
      client.geocode.mockResolvedValue({ status: "1", geocodes: [] });
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("geocode")!;

      const result = await handler(makeCtx({ address: "不存在的地址" }));
      expect(result).toContain("未找到");
    });

    it("API 异常时返回错误信息", async () => {
      const client = mockAmapClient();
      client.geocode.mockRejectedValue(new Error("API 限流"));
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("geocode")!;

      const result = await handler(makeCtx({ address: "测试" }));
      expect(result).toContain("失败");
      expect(result).toContain("API 限流");
    });
  });

  describe("reverse_geocode", () => {
    it("成功返回逆地理编码结果", async () => {
      const client = mockAmapClient();
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("reverse_geocode")!;

      const result = await handler(makeCtx({ location: "116.481028,39.989643" }));

      expect(result).toContain("北京市");
      expect(result).toContain("朝阳区");
      expect(result).toContain("阜通东大街");
      expect(client.reverseGeocode).toHaveBeenCalledWith("116.481028,39.989643");
    });

    it("缺少 location 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = geocodeTools.createHandlers(client);
      const handler = handlers.get("reverse_geocode")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("错误");
      expect(result).toContain("location");
    });
  });
});
