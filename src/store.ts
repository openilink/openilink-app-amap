/**
 * SQLite 持久化存储层（基于 better-sqlite3）
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Installation } from "./hub/types.js";
import { encryptConfig, decryptConfig } from "./utils/config-crypto.js";

/** 数据库存储管理器 */
export class Store {
  private db: Database.Database;

  constructor(dbPath: string) {
    // 内存数据库无需创建目录
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);

    // 启用 WAL 模式以提升并发性能
    this.db.pragma("journal_mode = WAL");

    this.initTables();
  }

  /** 创建所需的数据表 */
  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS installations (
        id            TEXT PRIMARY KEY,
        hub_url       TEXT NOT NULL,
        app_id        TEXT NOT NULL,
        bot_id        TEXT NOT NULL,
        app_token     TEXT NOT NULL,
        webhook_secret TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 兼容旧库：为 installations 表添加 encrypted_config 列
    try {
      this.db.exec(`ALTER TABLE installations ADD COLUMN encrypted_config TEXT NOT NULL DEFAULT ''`);
    } catch {
      // 列已存在则忽略
    }
  }

  // ─── Installation CRUD ────────────────────────────────────

  /** 保存或更新安装记录 */
  saveInstallation(inst: Installation): void {
    const stmt = this.db.prepare(`
      INSERT INTO installations (id, hub_url, app_id, bot_id, app_token, webhook_secret, created_at)
      VALUES (@id, @hubUrl, @appId, @botId, @appToken, @webhookSecret, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        hub_url        = excluded.hub_url,
        app_id         = excluded.app_id,
        bot_id         = excluded.bot_id,
        app_token      = excluded.app_token,
        webhook_secret = excluded.webhook_secret
    `);
    stmt.run({
      id: inst.id,
      hubUrl: inst.hubUrl,
      appId: inst.appId,
      botId: inst.botId,
      appToken: inst.appToken,
      webhookSecret: inst.webhookSecret,
      createdAt: inst.createdAt || new Date().toISOString(),
    });
  }

  /** 根据 ID 获取单条安装记录 */
  getInstallation(id: string): Installation | undefined {
    const row = this.db
      .prepare("SELECT * FROM installations WHERE id = ?")
      .get(id) as Record<string, string> | undefined;

    if (!row) return undefined;
    return this.rowToInstallation(row);
  }

  /** 获取所有安装记录 */
  getAllInstallations(): Installation[] {
    const rows = this.db
      .prepare("SELECT * FROM installations ORDER BY created_at DESC")
      .all() as Record<string, string>[];

    return rows.map((row) => this.rowToInstallation(row));
  }

  /** 将数据库行映射为 Installation 对象 */
  private rowToInstallation(row: Record<string, string>): Installation {
    return {
      id: row.id,
      hubUrl: row.hub_url,
      appId: row.app_id,
      botId: row.bot_id,
      appToken: row.app_token,
      webhookSecret: row.webhook_secret,
      createdAt: row.created_at,
    };
  }

  // ─── 用户配置（加密存储）────────────────────────────────

  /** 保存用户配置（AES-256-GCM 加密后存储） */
  saveConfig(installationId: string, config: Record<string, string>): void {
    const encrypted = encryptConfig(JSON.stringify(config));
    this.db
      .prepare(`UPDATE installations SET encrypted_config = ? WHERE id = ?`)
      .run(encrypted, installationId);
  }

  /** 读取用户配置（从本地解密） */
  getConfig(installationId: string): Record<string, string> {
    const row = this.db
      .prepare("SELECT encrypted_config FROM installations WHERE id = ?")
      .get(installationId) as { encrypted_config?: string } | undefined;
    if (!row?.encrypted_config) return {};
    try {
      return JSON.parse(decryptConfig(row.encrypted_config)) as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** 关闭数据库连接 */
  close(): void {
    this.db.close();
  }
}
