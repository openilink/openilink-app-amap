/**
 * 定位与距离工具测试
 */
import { describe, it, expect, vi } from "vitest";
import { locationTools } from "../../src/tools/location.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的 AmapClient */
function mockAmapClient() {
  return {
    geocode: vi.fn(),
    reverseGeocode: vi.fn(),
    searchPOI: vi.fn(),
    searchAround: vi.fn(),
    drivingRoute: vi.fn(),
    walkingRoute: vi.fn(),
    transitRoute: vi.fn(),
    weather: vi.fn(),
    ipLocation: vi.fn().mockResolvedValue({
      status: "1",
      province: "北京市",
      city: "北京市",
      adcode: "110000",
      rectangle: "116.0119343,39.66127144;116.7829835,40.2164962",
    }),
    distance: vi.fn().mockResolvedValue({
      status: "1",
      results: [
        {
          origin_id: "1",
          dest_id: "1",
          distance: "15230",
          duration: "1800",
        },
      ],
    }),
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

describe("locationTools", () => {
  it("定义了 2 个工具", () => {
    expect(locationTools.definitions).toHaveLength(2);
    expect(locationTools.definitions[0].name).toBe("ip_location");
    expect(locationTools.definitions[1].name).toBe("measure_distance");
  });

  describe("ip_location", () => {
    it("成功返回 IP 定位结果", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("ip_location")!;

      const result = await handler(makeCtx({}));

      expect(result).toContain("北京市");
      expect(result).toContain("110000");
    });

    it("支持传入指定 IP", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("ip_location")!;

      const result = await handler(makeCtx({ ip: "114.114.114.114" }));

      expect(result).toContain("IP");
      expect(client.ipLocation).toHaveBeenCalledWith("114.114.114.114");
    });

    it("API 异常时返回错误信息", async () => {
      const client = mockAmapClient();
      client.ipLocation.mockRejectedValue(new Error("网络超时"));
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("ip_location")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("失败");
      expect(result).toContain("网络超时");
    });
  });

  describe("measure_distance", () => {
    it("成功返回驾车距离", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("measure_distance")!;

      const result = await handler(
        makeCtx({
          origin: "116.481028,39.989643",
          destination: "116.405285,39.904989",
        }),
      );

      expect(result).toContain("15.2公里");
      expect(result).toContain("30分钟");
      expect(result).toContain("驾车距离");
      expect(client.distance).toHaveBeenCalledWith(
        "116.481028,39.989643",
        "116.405285,39.904989",
        2,
      );
    });

    it("支持步行（直线）距离", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("measure_distance")!;

      await handler(
        makeCtx({
          origin: "116.481028,39.989643",
          destination: "116.405285,39.904989",
          type: "walking",
        }),
      );

      expect(client.distance).toHaveBeenCalledWith(
        "116.481028,39.989643",
        "116.405285,39.904989",
        1,
      );
    });

    it("缺少 origin 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("measure_distance")!;

      const result = await handler(makeCtx({ destination: "116.405285,39.904989" }));
      expect(result).toContain("错误");
      expect(result).toContain("origin");
    });

    it("缺少 destination 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = locationTools.createHandlers(client);
      const handler = handlers.get("measure_distance")!;

      const result = await handler(makeCtx({ origin: "116.481028,39.989643" }));
      expect(result).toContain("错误");
      expect(result).toContain("destination");
    });
  });
});
