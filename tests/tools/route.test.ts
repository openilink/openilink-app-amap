/**
 * 路径规划工具测试
 */
import { describe, it, expect, vi } from "vitest";
import { routeTools } from "../../src/tools/route.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的 AmapClient */
function mockAmapClient() {
  return {
    geocode: vi.fn(),
    reverseGeocode: vi.fn(),
    searchPOI: vi.fn(),
    searchAround: vi.fn(),
    drivingRoute: vi.fn().mockResolvedValue({
      status: "1",
      route: {
        paths: [
          {
            distance: "15230",
            duration: "1800",
            tolls: "0",
            steps: [
              { instruction: "沿阜通东大街向东行驶500米" },
              { instruction: "右转进入望京西路" },
            ],
          },
        ],
      },
    }),
    walkingRoute: vi.fn().mockResolvedValue({
      status: "1",
      route: {
        paths: [
          {
            distance: "1200",
            duration: "900",
            steps: [
              { instruction: "沿阜通东大街向东步行300米" },
              { instruction: "右转步行至目的地" },
            ],
          },
        ],
      },
    }),
    transitRoute: vi.fn().mockResolvedValue({
      status: "1",
      route: {
        transits: [
          {
            distance: "12000",
            duration: "2400",
            cost: "4",
            walking_distance: "800",
            segments: [
              {
                bus: {
                  buslines: [
                    {
                      name: "地铁15号线",
                      departure_stop: { name: "望京站" },
                      arrival_stop: { name: "国贸站" },
                      via_num: "8",
                    },
                  ],
                },
              },
              {
                walking: { distance: "200" },
              },
            ],
          },
        ],
      },
    }),
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

describe("routeTools", () => {
  it("定义了 3 个工具", () => {
    expect(routeTools.definitions).toHaveLength(3);
    expect(routeTools.definitions.map((d) => d.name)).toEqual([
      "driving_route",
      "walking_route",
      "transit_route",
    ]);
  });

  describe("driving_route", () => {
    it("成功返回驾车路线", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("driving_route")!;

      const result = await handler(
        makeCtx({ origin: "116.481028,39.989643", destination: "116.405285,39.904989" }),
      );

      expect(result).toContain("驾车");
      expect(result).toContain("15.2公里");
      expect(result).toContain("30分钟");
      expect(result).toContain("阜通东大街");
    });

    it("缺少 origin 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("driving_route")!;

      const result = await handler(makeCtx({ destination: "116.405285,39.904989" }));
      expect(result).toContain("错误");
      expect(result).toContain("origin");
    });

    it("缺少 destination 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("driving_route")!;

      const result = await handler(makeCtx({ origin: "116.481028,39.989643" }));
      expect(result).toContain("错误");
      expect(result).toContain("destination");
    });
  });

  describe("walking_route", () => {
    it("成功返回步行路线", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("walking_route")!;

      const result = await handler(
        makeCtx({ origin: "116.481028,39.989643", destination: "116.485000,39.990000" }),
      );

      expect(result).toContain("步行");
      expect(result).toContain("1.2公里");
      expect(result).toContain("15分钟");
    });
  });

  describe("transit_route", () => {
    it("成功返回公交路线", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("transit_route")!;

      const result = await handler(
        makeCtx({
          origin: "116.481028,39.989643",
          destination: "116.405285,39.904989",
          city: "北京",
        }),
      );

      expect(result).toContain("公交");
      expect(result).toContain("北京");
      expect(result).toContain("地铁15号线");
      expect(result).toContain("望京站");
      expect(result).toContain("国贸站");
    });

    it("缺少 city 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = routeTools.createHandlers(client);
      const handler = handlers.get("transit_route")!;

      const result = await handler(
        makeCtx({ origin: "116.481028,39.989643", destination: "116.405285,39.904989" }),
      );
      expect(result).toContain("错误");
      expect(result).toContain("city");
    });
  });
});
