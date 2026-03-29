/**
 * 工具注册中心 — 汇总所有高德地图工具模块
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { AmapClient } from "../amap/client.js";

import { geocodeTools } from "./geocode.js";
import { searchTools } from "./search.js";
import { routeTools } from "./route.js";
import { weatherTools } from "./weather.js";
import { locationTools } from "./location.js";

/** 所有工具模块 */
const allModules = [
  geocodeTools,
  searchTools,
  routeTools,
  weatherTools,
  locationTools,
];

/**
 * 收集所有工具定义和处理函数
 * @param client AmapClient 实例
 * @returns 工具定义列表和处理函数映射
 */
export function collectAllTools(client: AmapClient): {
  definitions: ToolDefinition[];
  handlers: Map<string, ToolHandler>;
} {
  const definitions: ToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();

  for (const mod of allModules) {
    // 收集定义
    definitions.push(...mod.definitions);

    // 收集处理函数
    const moduleHandlers = mod.createHandlers(client);
    for (const [name, handler] of moduleHandlers) {
      handlers.set(name, handler);
    }
  }

  return { definitions, handlers };
}
