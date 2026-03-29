# OpeniLink App — 高德地图

通过微信查询高德地图信息的 OpeniLink Hub App。

## 功能

- **地理编码** — 地址转坐标、坐标转地址
- **POI 搜索** — 关键词搜索地点、周边搜索
- **路径规划** — 驾车、步行、公交路线
- **天气查询** — 实况天气 + 未来预报
- **IP 定位** — 根据 IP 定位城市
- **距离测量** — 计算两点间距离

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `HUB_URL` | 是 | Hub 服务地址 |
| `BASE_URL` | 是 | 本 App 公网回调地址 |
| `AMAP_KEY` | 是 | 高德 Web 服务 API Key |
| `PORT` | 否 | HTTP 端口，默认 8090 |
| `DB_PATH` | 否 | SQLite 路径，默认 data/amap.db |

## 开发

```bash
npm install
npm run dev
npm test
```

## 部署

```bash
docker compose up -d
```
