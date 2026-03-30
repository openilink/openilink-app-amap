# @openilink/app-amap

[![OpeniLink Hub](https://img.shields.io/badge/OpeniLink_Hub-安装到微信-07C160?style=for-the-badge&logo=wechat&logoColor=white)](https://github.com/openilink/openilink-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)]()

> 在微信里查地图 -- POI 搜索、路线规划、天气查询、地理编码，基于高德地图 API。

**10 个 AI Tools** | 纯工具型无状态应用

---

## 亮点

- **微信查地图** -- 「附近有什么好吃的」「从公司到机场怎么走」，对 Bot 说话即可
- **六大能力** -- POI 搜索、路线规划（驾车/步行/公交）、天气、地理编码、IP 定位、距离测量
- **自然语言驱动** -- Hub AI 自动解析地点和意图，无需记命令格式
- **无状态零存储** -- 请求即响应，不存储任何用户数据

## 10 个 AI Tools 一览

| 分类 | 工具 | 说明 |
|------|------|------|
| **地理编码** | `geocode` `reverse_geocode` | 地址转坐标 / 坐标转地址 |
| **POI 搜索** | `search_poi` `search_nearby` | 关键词搜索地点 / 周边搜索 |
| **路线规划** | `driving_route` `walking_route` `transit_route` | 驾车 / 步行 / 公交路线 |
| **天气** | `weather` | 实况天气 + 未来预报 |
| **IP 定位** | `ip_location` | 根据 IP 定位城市 |
| **距离** | `distance` | 计算两点间距离 |

## 使用方式

安装到 Bot 后，支持三种方式：

**自然语言（推荐）** -- 直接对 Bot 说话，Hub AI 自动识别意图并调用：
- "附近有什么好吃的"
- "从公司到机场怎么走"
- "北京明天天气怎么样"

**命令调用** -- `/search_poi --keywords 火锅 --city 北京`

**AI 自动调用** -- Hub AI 在多轮对话中自动判断何时需要调用本 App。

<details>
<summary><strong>部署与配置</strong></summary>

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `HUB_URL` | 是 | -- | Hub 服务地址 |
| `BASE_URL` | 是 | -- | 本 App 公网回调地址 |
| `AMAP_KEY` | 是 | -- | 高德 Web 服务 API Key |
| `PORT` | 否 | `8090` | HTTP 端口 |
| `DB_PATH` | 否 | `data/amap.db` | SQLite 路径 |

### 获取高德 API Key

1. 前往 [高德开放平台](https://lbs.amap.com/) 注册账号
2. 创建应用，添加「Web 服务」类型的 Key
3. 将获得的 Key 填入 `AMAP_KEY` 环境变量

### 启动

```bash
# Docker（推荐）
docker compose up -d

# 或源码运行
git clone https://github.com/openilink/openilink-app-amap.git
cd openilink-app-amap
npm install
npm run dev

# 测试
npm test
```

</details>

## 安全与隐私

- **无状态工具** -- 请求即响应，不存储任何用户数据
- **API Key 安全** -- 仅存储在服务端环境变量或 Installation 配置中，不会暴露给其他用户
- **完全开源** -- 所有代码接受社区审查；自部署后数据完全不经过第三方

## 更多 OpeniLink Hub App

| App | 说明 |
|-----|------|
| [openilink-hub](https://github.com/openilink/openilink-hub) | 开源微信 Bot 管理平台 |
| [app-notion](https://github.com/openilink/openilink-app-notion) | 微信操作 Notion -- 15 Tools |
| [app-github](https://github.com/openilink/openilink-app-github) | 微信管理 GitHub -- 36 Tools |
| [app-linear](https://github.com/openilink/openilink-app-linear) | 微信管理 Linear -- 13 Tools |
| [app-lark](https://github.com/openilink/openilink-app-lark) | 微信 <-> 飞书桥接 -- 34 Tools |
| [app-slack](https://github.com/openilink/openilink-app-slack) | 微信 <-> Slack 桥接 -- 23 Tools |
| [app-dingtalk](https://github.com/openilink/openilink-app-dingtalk) | 微信 <-> 钉钉桥接 -- 20 Tools |
| [app-discord](https://github.com/openilink/openilink-app-discord) | 微信 <-> Discord 桥接 -- 19 Tools |
| [app-google](https://github.com/openilink/openilink-app-google) | 微信操作 Google Workspace -- 18 Tools |

## License

MIT
