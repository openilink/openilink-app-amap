/**
 * Store 持久化存储层测试
 */
import { describe, it, expect, afterEach } from "vitest";
import { Store } from "../src/store.js";
import type { Installation } from "../src/hub/types.js";

describe("Store", () => {
  let store: Store;

  afterEach(() => {
    if (store) store.close();
  });

  it("可以使用内存数据库创建实例", () => {
    store = new Store(":memory:");
    expect(store).toBeDefined();
  });

  describe("Installation CRUD", () => {
    const testInstallation: Installation = {
      id: "inst-001",
      hubUrl: "https://hub.example.com",
      appId: "app-001",
      botId: "bot-001",
      appToken: "token-001",
      webhookSecret: "secret-001",
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    it("保存并读取安装记录", () => {
      store = new Store(":memory:");
      store.saveInstallation(testInstallation);

      const result = store.getInstallation("inst-001");
      expect(result).toBeDefined();
      expect(result!.id).toBe("inst-001");
      expect(result!.hubUrl).toBe("https://hub.example.com");
      expect(result!.appToken).toBe("token-001");
      expect(result!.webhookSecret).toBe("secret-001");
    });

    it("查询不存在的安装记录返回 undefined", () => {
      store = new Store(":memory:");
      const result = store.getInstallation("nonexistent");
      expect(result).toBeUndefined();
    });

    it("更新已有的安装记录", () => {
      store = new Store(":memory:");
      store.saveInstallation(testInstallation);

      // 更新 token
      store.saveInstallation({
        ...testInstallation,
        appToken: "new-token",
      });

      const result = store.getInstallation("inst-001");
      expect(result!.appToken).toBe("new-token");
    });

    it("获取所有安装记录", () => {
      store = new Store(":memory:");
      store.saveInstallation(testInstallation);
      store.saveInstallation({
        ...testInstallation,
        id: "inst-002",
        createdAt: "2025-06-01T00:00:00.000Z",
      });

      const all = store.getAllInstallations();
      expect(all).toHaveLength(2);
      // 按 created_at 降序
      expect(all[0].id).toBe("inst-002");
      expect(all[1].id).toBe("inst-001");
    });
  });
});
