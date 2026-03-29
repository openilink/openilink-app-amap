/**
 * 天气查询工具模块
 */
import type { ToolModule, ToolDefinition, ToolHandler, AmapClient } from "../hub/types.js";

/** 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "get_weather",
    description: "天气查询 — 查询指定城市的实况天气和未来预报",
    command: "get_weather",
    parameters: {
      city: { type: "string", description: "城市名称或 adcode 编码", required: true },
    },
  },
];

/** 创建处理函数 */
function createHandlers(client: AmapClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_weather", async (ctx) => {
    try {
      const { city } = ctx.args;
      if (!city) return "错误：请提供城市名称或 adcode（city）";

      // 同时查询实况天气和预报天气
      const [baseData, allData] = await Promise.all([
        client.weather(city as string, "base"),
        client.weather(city as string, "all"),
      ]);

      const lives = baseData.lives as any[];
      const forecasts = allData.forecasts as any[];

      const lines: string[] = [];

      // 实况天气
      if (lives && lives.length > 0) {
        const live = lives[0];
        lines.push(`🌤️ ${live.province}${live.city} 实况天气\n`);
        lines.push(`天气：${live.weather || "—"}`);
        lines.push(`温度：${live.temperature || "—"}°C`);
        lines.push(`风向：${live.winddirection || "—"}`);
        lines.push(`风力：${live.windpower || "—"}级`);
        lines.push(`湿度：${live.humidity || "—"}%`);
        lines.push(`发布时间：${live.reporttime || "—"}`);
      }

      // 未来天气预报
      if (forecasts && forecasts.length > 0) {
        const forecast = forecasts[0];
        const casts = forecast.casts as any[];
        if (casts && casts.length > 0) {
          lines.push(`\n📅 未来天气预报：\n`);
          casts.forEach((cast: any) => {
            lines.push(`${cast.date}（${cast.week ? "周" + "日一二三四五六"[Number(cast.week)] : "—"}）`);
            lines.push(`  白天：${cast.dayweather || "—"} ${cast.daytemp || "—"}°C ${cast.daywind || "—"}风${cast.daypower || "—"}级`);
            lines.push(`  夜间：${cast.nightweather || "—"} ${cast.nighttemp || "—"}°C ${cast.nightwind || "—"}风${cast.nightpower || "—"}级`);
          });
        }
      }

      if (lines.length === 0) {
        return `未查询到城市「${city}」的天气信息`;
      }

      return lines.join("\n");
    } catch (err: any) {
      return `天气查询失败：${err.message}`;
    }
  });

  return handlers;
}

export const weatherTools: ToolModule = { definitions, createHandlers };
