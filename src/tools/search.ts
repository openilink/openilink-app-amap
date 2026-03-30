/**
 * 地点搜索工具模块 — POI 搜索与周边搜索
 */
import type { ToolModule, ToolDefinition, ToolHandler, AmapClient } from "../hub/types.js";

/** 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "search_poi",
    description: "搜索地点 — 根据关键词搜索 POI（兴趣点）",
    command: "search_poi",
    parameters: {
      type: "object",
      properties: {
        keywords: { type: "string", description: '搜索关键词，如"火锅"、"加油站"' },
        city: { type: "string", description: '城市名，如"北京"，限定搜索范围' },
        count: { type: "number", description: "返回数量，默认 10" },
      },
      required: ["keywords"],
    },
  },
  {
    name: "search_around",
    description: "周边搜索 — 搜索指定坐标附近的地点",
    command: "search_around",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: '中心点坐标，格式: 经度,纬度' },
        keywords: { type: "string", description: '搜索关键词，如"餐厅"' },
        radius: { type: "number", description: "搜索半径，单位米，默认 1000" },
      },
      required: ["location"],
    },
  },
];

/** 格式化 POI 列表 */
function formatPOIList(pois: any[]): string {
  return pois
    .map((poi: any, i: number) => {
      const parts = [`${i + 1}. ${poi.name || "未知名称"}`];
      if (poi.address) parts.push(`   地址：${poi.address}`);
      if (poi.tel) parts.push(`   电话：${poi.tel}`);
      if (poi.distance) parts.push(`   距离：${poi.distance}米`);
      if (poi.location) parts.push(`   坐标：${poi.location}`);
      if (poi.type) parts.push(`   类型：${poi.type}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

/** 创建处理函数 */
function createHandlers(client: AmapClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // POI 关键词搜索
  handlers.set("search_poi", async (ctx) => {
    try {
      const { keywords, city, count } = ctx.args;
      if (!keywords) return "错误：请提供搜索关键词（keywords）";

      const data = await client.searchPOI(
        keywords as string,
        city as string | undefined,
      );
      const pois = data.pois as any[];

      if (!pois || pois.length === 0) {
        return `未找到与「${keywords}」相关的地点${city ? `（城市：${city}）` : ""}`;
      }

      // 截取指定数量
      const limit = (count as number) ?? 10;
      const sliced = pois.slice(0, limit);

      const header = city
        ? `在「${city}」搜索「${keywords}」，找到 ${pois.length} 个结果：`
        : `搜索「${keywords}」，找到 ${pois.length} 个结果：`;

      return `${header}\n\n${formatPOIList(sliced)}`;
    } catch (err: any) {
      return `搜索地点失败：${err.message}`;
    }
  });

  // 周边搜索
  handlers.set("search_around", async (ctx) => {
    try {
      const { location, keywords, radius } = ctx.args;
      if (!location) return '错误：请提供中心点坐标（location），格式: 经度,纬度';

      const data = await client.searchAround(
        location as string,
        keywords as string | undefined,
        radius as number | undefined,
      );
      const pois = data.pois as any[];

      if (!pois || pois.length === 0) {
        return `在坐标「${location}」附近未找到${keywords ? `「${keywords}」相关的` : ""}地点`;
      }

      const r = radius ?? 1000;
      const header = keywords
        ? `在坐标「${location}」${r}米范围内搜索「${keywords}」，找到 ${pois.length} 个结果：`
        : `在坐标「${location}」${r}米范围内找到 ${pois.length} 个地点：`;

      return `${header}\n\n${formatPOIList(pois)}`;
    } catch (err: any) {
      return `周边搜索失败：${err.message}`;
    }
  });

  return handlers;
}

export const searchTools: ToolModule = { definitions, createHandlers };
