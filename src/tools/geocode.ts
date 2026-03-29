/**
 * 地理编码工具模块 — 地址与坐标互转
 */
import type { ToolModule, ToolDefinition, ToolHandler, AmapClient } from "../hub/types.js";

/** 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "geocode",
    description: "地址转坐标 — 将结构化地址转换为经纬度坐标",
    command: "geocode",
    parameters: {
      address: { type: "string", description: '结构化地址，如"北京市朝阳区阜通东大街6号"', required: true },
      city: { type: "string", description: '城市名，如"北京"，可提高解析精度' },
    },
  },
  {
    name: "reverse_geocode",
    description: "坐标转地址 — 将经纬度坐标转换为结构化地址",
    command: "reverse_geocode",
    parameters: {
      location: { type: "string", description: '经纬度坐标，格式: 经度,纬度，如 116.397428,39.90923', required: true },
    },
  },
];

/** 创建处理函数 */
function createHandlers(client: AmapClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 地理编码：地址 → 坐标
  handlers.set("geocode", async (ctx) => {
    try {
      const { address, city } = ctx.args;
      if (!address) return "错误：请提供地址（address）";

      const data = await client.geocode(address as string, city as string | undefined);
      const geocodes = data.geocodes as any[];

      if (!geocodes || geocodes.length === 0) {
        return `未找到地址「${address}」对应的坐标`;
      }

      const lines = geocodes.map((g: any, i: number) => {
        return [
          `${i + 1}. ${g.formatted_address || address}`,
          `   坐标：${g.location}`,
          `   省份：${g.province || "—"}`,
          `   城市：${g.city || "—"}`,
          `   区县：${g.district || "—"}`,
          `   级别：${g.level || "—"}`,
        ].join("\n");
      });

      return `地址「${address}」的地理编码结果：\n\n${lines.join("\n\n")}`;
    } catch (err: any) {
      return `地理编码失败：${err.message}`;
    }
  });

  // 逆地理编码：坐标 → 地址
  handlers.set("reverse_geocode", async (ctx) => {
    try {
      const { location } = ctx.args;
      if (!location) return '错误：请提供坐标（location），格式: 经度,纬度';

      const data = await client.reverseGeocode(location as string);
      const regeo = data.regeocode as any;

      if (!regeo) {
        return `未找到坐标「${location}」对应的地址`;
      }

      const addr = regeo.formatted_address || "未知地址";
      const comp = regeo.addressComponent || {};

      return [
        `坐标「${location}」的地址信息：`,
        ``,
        `完整地址：${addr}`,
        `省份：${comp.province || "—"}`,
        `城市：${comp.city || "—"}`,
        `区县：${comp.district || "—"}`,
        `街道：${comp.streetNumber?.street || "—"}`,
        `门牌号：${comp.streetNumber?.number || "—"}`,
        `行政编码：${comp.adcode || "—"}`,
      ].join("\n");
    } catch (err: any) {
      return `逆地理编码失败：${err.message}`;
    }
  });

  return handlers;
}

export const geocodeTools: ToolModule = { definitions, createHandlers };
