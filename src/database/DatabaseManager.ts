import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface NewsItem {
  id?: number;
  source_name: string;
  news_title: string;
  coins_included: string;
  url: string;
  timestamp: number;
  message_hash: string;
  created_at: number;
  sent_to_groups: string;
}

export interface ChatConfig {
  chat_id: string;
  chat_title: string;
  is_active: boolean;
  filters: string;
  created_at: number;
  updated_at: number;
}

export class DatabaseManager {
  private db: Database;

  constructor(dbPath: string) {
    // 确保数据目录存在
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    const newsTable = `
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        news_title TEXT NOT NULL,
        coins_included TEXT,
        url TEXT,
        timestamp INTEGER,
        message_hash TEXT UNIQUE,
        created_at INTEGER,
        sent_to_groups TEXT DEFAULT '[]'
      )
    `;

    const chatsTable = `
      CREATE TABLE IF NOT EXISTS chats (
        chat_id TEXT PRIMARY KEY,
        chat_title TEXT,
        is_active BOOLEAN DEFAULT 1,
        filters TEXT DEFAULT '[]',
        created_at INTEGER,
        updated_at INTEGER
      )
    `;

    this.db.run(newsTable);
    this.db.run(chatsTable);
    
    console.log('✅ 数据库初始化完成');
  }

  async checkNewsExists(hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT id FROM news WHERE message_hash = ?",
        [hash],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  async saveNews(news: NewsItem): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO news 
        (source_name, news_title, coins_included, url, timestamp, message_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        news.source_name,
        news.news_title,
        news.coins_included,
        news.url,
        news.timestamp,
        news.message_hash,
        Date.now()
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async registerChat(chatId: string, chatTitle: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chats 
        (chat_id, chat_title, is_active, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?)
      `);
      
      const now = Date.now();
      stmt.run([chatId, chatTitle, now, now], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ 注册群组: ${chatTitle} (${chatId})`);
          resolve();
        }
      });
    });
  }

  async getActiveChats(): Promise<ChatConfig[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM chats WHERE is_active = 1",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as ChatConfig[]);
          }
        }
      );
    });
  }

  async updateChatFilters(chatId: string, filters: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE chats 
        SET filters = ?, updated_at = ?
        WHERE chat_id = ?
      `);
      
      stmt.run([JSON.stringify(filters), Date.now(), chatId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deactivateChat(chatId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE chats 
        SET is_active = 0, updated_at = ?
        WHERE chat_id = ?
      `);
      
      stmt.run([Date.now(), chatId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
