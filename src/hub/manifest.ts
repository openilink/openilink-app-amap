/**
 * 应用清单定义
 *
 * 向 Hub 注册时使用的元信息，包含应用名称、图标、订阅的事件类型等。
 */

/** 应用清单结构 */
export interface AppManifest {
  /** 应用唯一标识（URL 友好） */
  slug: string;
  /** 应用显示名称 */
  name: string;
  /** 应用图标（emoji 或 URL） */
  icon: string;
  /** 应用描述 */
  description: string;
  /** 订阅的事件类型列表 */
  events: string[];
}

/** 高德地图应用清单 */
export const manifest: AppManifest = {
  slug: "amap",
  name: "高德地图",
  icon: "\uD83D\uDDFA\uFE0F",
  description: "通过微信查询高德地图信息，支持地理编码、POI搜索、路径规划、天气查询等",
  events: ["command"],
};
