/**
 * 高德地图 Web 服务 API 封装
 *
 * 基于 REST API，使用 fetch 调用，无需第三方 SDK。
 * 文档：https://lbs.amap.com/api/webservice/summary
 */

/** 高德 API 响应基础结构 */
export interface AmapResponse {
  /** 状态码，"1" 表示成功 */
  status: string;
  /** 状态描述 */
  info: string;
  /** 详细状态码 */
  infocode: string;
  /** 业务数据（不同接口返回不同结构） */
  [key: string]: unknown;
}

/** 高德 API 客户端 */
export class AmapClient {
  /** API 基础路径（v3） */
  private readonly baseUrlV3 = "https://restapi.amap.com/v3";
  /** API 基础路径（v5） */
  private readonly baseUrlV5 = "https://restapi.amap.com/v5";
  /** 高德 API Key */
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  /**
   * 地理编码 — 地址转经纬度坐标
   * @param address - 结构化地址，如"北京市朝阳区阜通东大街6号"
   * @param city - 城市名（可选，用于提高精度）
   */
  async geocode(address: string, city?: string): Promise<any> {
    const params: Record<string, string> = { address };
    if (city) params.city = city;
    return this.request("/v3/geocode/geo", params);
  }

  /**
   * 逆地理编码 — 经纬度坐标转地址
   * @param location - 经纬度坐标，格式："经度,纬度"
   */
  async reverseGeocode(location: string): Promise<any> {
    return this.request("/v3/geocode/regeo", { location });
  }

  /**
   * POI 关键词搜索
   * @param keywords - 搜索关键词，如"火锅"
   * @param city - 城市名（可选）
   * @param types - POI 类型编码（可选）
   * @param page - 页码，默认 1
   */
  async searchPOI(keywords: string, city?: string, types?: string, page?: number): Promise<any> {
    const params: Record<string, string> = { keywords };
    if (city) params.city = city;
    if (types) params.types = types;
    if (page) params.page = String(page);
    params.offset = "10";
    return this.request("/v3/place/text", params);
  }

  /**
   * 周边搜索
   * @param location - 中心点坐标，格式："经度,纬度"
   * @param keywords - 搜索关键词（可选）
   * @param radius - 搜索半径，单位米，默认 1000
   */
  async searchAround(location: string, keywords?: string, radius?: number): Promise<any> {
    const params: Record<string, string> = { location };
    if (keywords) params.keywords = keywords;
    params.radius = String(radius ?? 1000);
    params.offset = "10";
    return this.request("/v3/place/around", params);
  }

  /**
   * 驾车路径规划
   * @param origin - 起点坐标，格式："经度,纬度"
   * @param destination - 终点坐标，格式："经度,纬度"
   */
  async drivingRoute(origin: string, destination: string): Promise<any> {
    return this.request("/v3/direction/driving", { origin, destination });
  }

  /**
   * 步行路径规划
   * @param origin - 起点坐标，格式："经度,纬度"
   * @param destination - 终点坐标，格式："经度,纬度"
   */
  async walkingRoute(origin: string, destination: string): Promise<any> {
    return this.request("/v3/direction/walking", { origin, destination });
  }

  /**
   * 公交路径规划
   * @param origin - 起点坐标，格式："经度,纬度"
   * @param destination - 终点坐标，格式："经度,纬度"
   * @param city - 城市名或城市编码
   */
  async transitRoute(origin: string, destination: string, city: string): Promise<any> {
    return this.request("/v3/direction/transit/integrated", { origin, destination, city });
  }

  /**
   * 天气查询
   * @param city - 城市名称或 adcode
   * @param extensions - 查询类型："base" 实况天气，"all" 预报天气
   */
  async weather(city: string, extensions: "base" | "all" = "base"): Promise<any> {
    return this.request("/v3/weather/weatherInfo", { city, extensions });
  }

  /**
   * IP 定位
   * @param ip - IP 地址（可选，不传则定位当前请求 IP）
   */
  async ipLocation(ip?: string): Promise<any> {
    const params: Record<string, string> = {};
    if (ip) params.ip = ip;
    return this.request("/v3/ip", params);
  }

  /**
   * 距离测量
   * @param origins - 起点坐标（可多个，用 | 分隔），格式："经度,纬度"
   * @param destination - 终点坐标，格式："经度,纬度"
   * @param type - 距离类型：1=直线 2=驾车 3=公交（默认 1）
   */
  async distance(origins: string, destination: string, type: number = 1): Promise<any> {
    return this.request("/v3/distance", {
      origins,
      destination,
      type: String(type),
    });
  }

  /**
   * 通用请求方法 — 拼接 URL + key 参数，发起 HTTP 请求
   * @param path - API 路径（包含版本前缀，如 /v3/geocode/geo）
   * @param params - 查询参数（不含 key）
   */
  async request(path: string, params: Record<string, string>): Promise<any> {
    // 根据路径选择基础 URL
    const baseUrl = path.startsWith("/v5") ? this.baseUrlV5 : this.baseUrlV3;
    // 去掉路径中的版本前缀，得到实际 API 路径
    const apiPath = path.replace(/^\/v[35]/, "");
    const url = new URL(apiPath, baseUrl);

    // 追加 key 参数
    url.searchParams.set("key", this.key);
    // 追加业务参数
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    // 30 秒超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const resp = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`高德 API HTTP 错误: ${resp.status} ${resp.statusText}`);
      }

      const data = (await resp.json()) as AmapResponse;

      // 检查高德 API 业务状态码
      if (data.status !== "1") {
        throw new Error(`高德 API 业务错误: [${data.infocode}] ${data.info}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
