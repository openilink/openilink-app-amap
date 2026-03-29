/**
 * 配置模块测试
 */
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  /** 提供完整的最小合法环境变量 */
  const validEnv = {
    HUB_URL: "https://hub.example.com",
    BASE_URL: "https://app.example.com",
    AMAP_KEY: "test_amap_key_123",
  };

  it("使用默认端口 8090", () => {
    const config = loadConfig(validEnv);
    expect(config.port).toBe("8090");
  });

  it("可以通过 PORT 覆盖默认端口", () => {
    const config = loadConfig({ ...validEnv, PORT: "3000" });
    expect(config.port).toBe("3000");
  });

  it("使用默认数据库路径 data/amap.db", () => {
    const config = loadConfig(validEnv);
    expect(config.dbPath).toBe("data/amap.db");
  });

  it("可以通过 DB_PATH 覆盖数据库路径", () => {
    const config = loadConfig({ ...validEnv, DB_PATH: "/tmp/test.db" });
    expect(config.dbPath).toBe("/tmp/test.db");
  });

  // 必填项校验
  it("缺少 HUB_URL 时抛出异常", () => {
    expect(() =>
      loadConfig({ BASE_URL: "https://app.example.com", AMAP_KEY: "key123" }),
    ).toThrow("HUB_URL");
  });

  it("缺少 BASE_URL 时抛出异常", () => {
    expect(() =>
      loadConfig({ HUB_URL: "https://hub.example.com", AMAP_KEY: "key123" }),
    ).toThrow("BASE_URL");
  });

  it("缺少 AMAP_KEY 时抛出异常", () => {
    expect(() =>
      loadConfig({ HUB_URL: "https://hub.example.com", BASE_URL: "https://app.example.com" }),
    ).toThrow("AMAP_KEY");
  });

  it("正确加载所有配置项", () => {
    const config = loadConfig({
      PORT: "9090",
      HUB_URL: "https://hub.example.com",
      BASE_URL: "https://app.example.com",
      DB_PATH: "/data/my.db",
      AMAP_KEY: "my_amap_key",
    });

    expect(config).toEqual({
      port: "9090",
      hubUrl: "https://hub.example.com",
      baseUrl: "https://app.example.com",
      dbPath: "/data/my.db",
      amapKey: "my_amap_key",
    });
  });

  it("自动 trim 环境变量中的空格", () => {
    const config = loadConfig({
      HUB_URL: "  https://hub.example.com  ",
      BASE_URL: "  https://app.example.com  ",
      AMAP_KEY: "  key123  ",
    });
    expect(config.hubUrl).toBe("https://hub.example.com");
    expect(config.baseUrl).toBe("https://app.example.com");
    expect(config.amapKey).toBe("key123");
  });
});
