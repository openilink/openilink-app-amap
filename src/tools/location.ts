/**
 * 定位与距离工具模块 — IP 定位、距离测量
 */
import type { ToolModule, ToolDefinition, ToolHandler, AmapClient } from "../hub/types.js";

/** 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "ip_location",
    description: "IP 定位 — 根据 IP 地址定位所在城市",
    command: "ip_location",
    parameters: {
      type: "object",
      properties: {
        ip: { type: "string", description: "IP 地址，不填则定位当前请求的 IP" },
      },
      required: [],
    },
  },
  {
    name: "measure_distance",
    description: "测量距离 — 计算两点之间的距离",
    command: "measure_distance",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "起点坐标，格式: 经度,纬度" },
        destination: { type: "string", description: "终点坐标，格式: 经度,纬度" },
        type: { type: "string", description: "距离类型：driving（驾车）或 walking（步行/直线），默认 driving", enum: ["driving", "walking"] },
      },
      required: ["origin", "destination"],
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

  // IP 定位
  handlers.set("ip_location", async (ctx) => {
    try {
      const { ip } = ctx.args;
      const data = await client.ipLocation(ip as string | undefined);

      const lines: string[] = [`📍 IP 定位结果\n`];
      lines.push(`省份：${data.province || "—"}`);
      lines.push(`城市：${data.city || "—"}`);
      lines.push(`行政编码：${data.adcode || "—"}`);
      if (data.rectangle) {
        lines.push(`区域范围：${data.rectangle}`);
      }
      if (ip) {
        lines.push(`查询 IP：${ip}`);
      }

      return lines.join("\n");
    } catch (err: any) {
      return `IP 定位失败：${err.message}`;
    }
  });

  // 距离测量
  handlers.set("measure_distance", async (ctx) => {
    try {
      const { origin, destination, type } = ctx.args;
      if (!origin) return "错误：请提供起点坐标（origin）";
      if (!destination) return "错误：请提供终点坐标（destination）";

      // 类型映射：driving → 2（驾车），walking → 1（直线距离）
      const typeStr = (type as string) || "driving";
      const typeNum = typeStr === "walking" ? 1 : 2;

      const data = await client.distance(
        origin as string,
        destination as string,
        typeNum,
      );
      const results = data.results as any[];

      if (!results || results.length === 0) {
        return "未能计算距离";
      }

      const result = results[0];
      const lines: string[] = [`📏 距离测量结果\n`];
      lines.push(`类型：${typeStr === "walking" ? "直线距离" : "驾车距离"}`);
      lines.push(`距离：${formatDistance(result.distance)}`);
      if (result.duration && typeNum === 2) {
        lines.push(`预计时间：${formatDuration(result.duration)}`);
      }

      return lines.join("\n");
    } catch (err: any) {
      return `距离测量失败：${err.message}`;
    }
  });

  return handlers;
}

export const locationTools: ToolModule = { definitions, createHandlers };
