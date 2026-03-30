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
  /** 配置表单 JSON Schema */
  config_schema?: Record<string, unknown>;
  /** 安装引导说明（Markdown） */
  guide?: string;
}

/** 高德地图应用清单 */
export const manifest: AppManifest = {
  slug: "amap",
  name: "高德地图",
  icon: "\uD83D\uDDFA\uFE0F",
  description: "通过微信查询高德地图信息，支持地理编码、POI搜索、路径规划、天气查询等",
  events: ["command"],
  config_schema: {
    type: "object",
    properties: {
      amap_key: { type: "string", title: "高德 Key", description: "在高德开放平台创建应用后获取 Web 服务 Key" },
    },
    required: ["amap_key"],
  },
  guide: "## 高德地图安装指南\n### 第 1 步\n访问 [lbs.amap.com](https://lbs.amap.com/dev/key) → 创建应用 → 添加 Key（服务平台选 Web 服务）\n### 第 2 步\n填写 Key 并安装\n\n安装后可通过 /settings 页面随时修改配置。",
};
