/**
 * 路径规划工具模块 — 驾车/步行/公交路线
 */
import type { ToolModule, ToolDefinition, ToolHandler, AmapClient } from "../hub/types.js";

/** 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "driving_route",
    description: "驾车路线规划 — 查询两点之间的驾车路线",
    command: "driving_route",
    parameters: {
      origin: { type: "string", description: "起点坐标，格式: 经度,纬度", required: true },
      destination: { type: "string", description: "终点坐标，格式: 经度,纬度", required: true },
    },
  },
  {
    name: "walking_route",
    description: "步行路线规划 — 查询两点之间的步行路线",
    command: "walking_route",
    parameters: {
      origin: { type: "string", description: "起点坐标，格式: 经度,纬度", required: true },
      destination: { type: "string", description: "终点坐标，格式: 经度,纬度", required: true },
    },
  },
  {
    name: "transit_route",
    description: "公交路线规划 — 查询两点之间的公交/地铁路线",
    command: "transit_route",
    parameters: {
      origin: { type: "string", description: "起点坐标，格式: 经度,纬度", required: true },
      destination: { type: "string", description: "终点坐标，格式: 经度,纬度", required: true },
      city: { type: "string", description: "城市名或城市编码", required: true },
    },
  },
];

/** 格式化距离（米 → 公里） */
function formatDistance(meters: string | number): string {
  const m = Number(meters);
  if (isNaN(m)) return String(meters);
  if (m < 1000) return `${m}米`;
  return `${(m / 1000).toFixed(1)}公里`;
}

/** 格式化时间（秒 → 分钟/小时） */
function formatDuration(seconds: string | number): string {
  const s = Number(seconds);
  if (isNaN(s)) return String(seconds);
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.ceil(s / 60)}分钟`;
  const h = Math.floor(s / 3600);
  const m = Math.ceil((s % 3600) / 60);
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

/** 创建处理函数 */
function createHandlers(client: AmapClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 驾车路线
  handlers.set("driving_route", async (ctx) => {
    try {
      const { origin, destination } = ctx.args;
      if (!origin) return "错误：请提供起点坐标（origin）";
      if (!destination) return "错误：请提供终点坐标（destination）";

      const data = await client.drivingRoute(origin as string, destination as string);
      const route = data.route as any;

      if (!route || !route.paths || route.paths.length === 0) {
        return "未找到驾车路线";
      }

      const lines: string[] = [`🚗 驾车路线规划\n`];

      route.paths.forEach((path: any, i: number) => {
        lines.push(`方案 ${i + 1}：`);
        lines.push(`  总距离：${formatDistance(path.distance)}`);
        lines.push(`  预计时间：${formatDuration(path.duration)}`);
        lines.push(`  收费：${path.tolls ? `${path.tolls}元` : "免费"}`);

        // 提取路线描述
        if (path.steps && path.steps.length > 0) {
          lines.push(`  路线：`);
          path.steps.forEach((step: any, j: number) => {
            const instruction = step.instruction || step.action || "继续行驶";
            lines.push(`    ${j + 1}. ${instruction}`);
          });
        }
        lines.push("");
      });

      return lines.join("\n");
    } catch (err: any) {
      return `驾车路线规划失败：${err.message}`;
    }
  });

  // 步行路线
  handlers.set("walking_route", async (ctx) => {
    try {
      const { origin, destination } = ctx.args;
      if (!origin) return "错误：请提供起点坐标（origin）";
      if (!destination) return "错误：请提供终点坐标（destination）";

      const data = await client.walkingRoute(origin as string, destination as string);
      const route = data.route as any;

      if (!route || !route.paths || route.paths.length === 0) {
        return "未找到步行路线";
      }

      const lines: string[] = [`🚶 步行路线规划\n`];

      route.paths.forEach((path: any, i: number) => {
        lines.push(`方案 ${i + 1}：`);
        lines.push(`  总距离：${formatDistance(path.distance)}`);
        lines.push(`  预计时间：${formatDuration(path.duration)}`);

        if (path.steps && path.steps.length > 0) {
          lines.push(`  路线：`);
          path.steps.forEach((step: any, j: number) => {
            const instruction = step.instruction || step.action || "继续步行";
            lines.push(`    ${j + 1}. ${instruction}`);
          });
        }
        lines.push("");
      });

      return lines.join("\n");
    } catch (err: any) {
      return `步行路线规划失败：${err.message}`;
    }
  });

  // 公交路线
  handlers.set("transit_route", async (ctx) => {
    try {
      const { origin, destination, city } = ctx.args;
      if (!origin) return "错误：请提供起点坐标（origin）";
      if (!destination) return "错误：请提供终点坐标（destination）";
      if (!city) return "错误：请提供城市名（city）";

      const data = await client.transitRoute(
        origin as string,
        destination as string,
        city as string,
      );
      const route = data.route as any;

      if (!route || !route.transits || route.transits.length === 0) {
        return "未找到公交路线";
      }

      const lines: string[] = [`🚌 公交路线规划（${city}）\n`];

      // 最多展示 3 条方案
      const transits = route.transits.slice(0, 3);
      transits.forEach((transit: any, i: number) => {
        lines.push(`方案 ${i + 1}：`);
        lines.push(`  总距离：${formatDistance(transit.distance)}`);
        lines.push(`  预计时间：${formatDuration(transit.duration)}`);
        lines.push(`  费用：${transit.cost ? `${transit.cost}元` : "—"}`);
        lines.push(`  步行距离：${formatDistance(transit.walking_distance || "0")}`);

        // 提取换乘段落
        if (transit.segments && transit.segments.length > 0) {
          lines.push(`  换乘方案：`);
          transit.segments.forEach((seg: any, j: number) => {
            const bus = seg.bus?.buslines?.[0];
            if (bus) {
              lines.push(`    ${j + 1}. 乘坐 ${bus.name}（${bus.departure_stop?.name || "—"} → ${bus.arrival_stop?.name || "—"}，${bus.via_num || "?"}站）`);
            } else if (seg.walking?.distance && Number(seg.walking.distance) > 0) {
              lines.push(`    ${j + 1}. 步行 ${formatDistance(seg.walking.distance)}`);
            }
          });
        }
        lines.push("");
      });

      return lines.join("\n");
    } catch (err: any) {
      return `公交路线规划失败：${err.message}`;
    }
  });

  return handlers;
}

export const routeTools: ToolModule = { definitions, createHandlers };
