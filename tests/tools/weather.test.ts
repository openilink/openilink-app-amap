/**
 * 天气查询工具测试
 */
import { describe, it, expect, vi } from "vitest";
import { weatherTools } from "../../src/tools/weather.js";
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
    weather: vi.fn().mockImplementation((_city: string, extensions: string) => {
      if (extensions === "base") {
        return Promise.resolve({
          status: "1",
          lives: [
            {
              province: "北京",
              city: "北京市",
              weather: "晴",
              temperature: "28",
              winddirection: "南",
              windpower: "3",
              humidity: "45",
              reporttime: "2025-07-01 14:00:00",
            },
          ],
        });
      }
      return Promise.resolve({
        status: "1",
        forecasts: [
          {
            city: "北京市",
            casts: [
              {
                date: "2025-07-01",
                week: "2",
                dayweather: "晴",
                nightweather: "多云",
                daytemp: "32",
                nighttemp: "22",
                daywind: "南",
                nightwind: "北",
                daypower: "3",
                nightpower: "2",
              },
              {
                date: "2025-07-02",
                week: "3",
                dayweather: "多云",
                nightweather: "阴",
                daytemp: "30",
                nighttemp: "21",
                daywind: "东",
                nightwind: "东",
                daypower: "2",
                nightpower: "2",
              },
            ],
          },
        ],
      });
    }),
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

describe("weatherTools", () => {
  it("定义了 1 个工具 get_weather", () => {
    expect(weatherTools.definitions).toHaveLength(1);
    expect(weatherTools.definitions[0].name).toBe("get_weather");
  });

  describe("get_weather", () => {
    it("成功返回天气信息（实况+预报）", async () => {
      const client = mockAmapClient();
      const handlers = weatherTools.createHandlers(client);
      const handler = handlers.get("get_weather")!;

      const result = await handler(makeCtx({ city: "北京" }));

      // 实况天气
      expect(result).toContain("晴");
      expect(result).toContain("28");
      expect(result).toContain("45");
      // 预报天气
      expect(result).toContain("2025-07-01");
      expect(result).toContain("32");
      expect(result).toContain("多云");
      // 调用两次 weather API（base + all）
      expect(client.weather).toHaveBeenCalledTimes(2);
      expect(client.weather).toHaveBeenCalledWith("北京", "base");
      expect(client.weather).toHaveBeenCalledWith("北京", "all");
    });

    it("缺少 city 返回错误", async () => {
      const client = mockAmapClient();
      const handlers = weatherTools.createHandlers(client);
      const handler = handlers.get("get_weather")!;

      const result = await handler(makeCtx({}));
      expect(result).toContain("错误");
      expect(result).toContain("city");
    });

    it("API 异常时返回错误信息", async () => {
      const client = mockAmapClient();
      client.weather.mockRejectedValue(new Error("服务不可用"));
      const handlers = weatherTools.createHandlers(client);
      const handler = handlers.get("get_weather")!;

      const result = await handler(makeCtx({ city: "北京" }));
      expect(result).toContain("失败");
      expect(result).toContain("服务不可用");
    });
  });
});
