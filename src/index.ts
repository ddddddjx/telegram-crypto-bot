import dotenv from 'dotenv';
import { NewsWebSocketClient, BWENewsMessage } from './services/NewsWebSocketClient';
import { MessageProcessor } from './services/MessageProcessor';
import { CryptoNewsBot } from './services/TelegramBot';
import { DatabaseManager } from './database/DatabaseManager';

dotenv.config();

console.log('🚀 启动AlphaNews Bot...');

// 验证环境变量
if (!process.env.BOT_TOKEN) {
  console.error('❌ 缺少BOT_TOKEN环境变量');
  process.exit(1);
}

// 初始化组件
const db = new DatabaseManager(process.env.DATABASE_PATH || './data/bot.db');
const wsClient = new NewsWebSocketClient(process.env.BWENEWS_WS_URL || 'wss://bwenews-api.bwe-ws.com/ws');
const messageProcessor = new MessageProcessor();
const telegramBot = new CryptoNewsBot(process.env.BOT_TOKEN, db);

// 处理新闻事件
wsClient.on('news', async (news: BWENewsMessage) => {
  try {
    console.log('📰 收到新闻:', news.news_title);
    
    const processedMessage = messageProcessor.processNews(news);
    
    // 检查新闻是否已存在
    const newsExists = await db.checkNewsExists(processedMessage.hash);
    
    if (!newsExists) {
      await db.saveNews({
        source_name: news.source_name,
        news_title: news.news_title,
        coins_included: JSON.stringify(news.coins_included || []),
        url: news.url,
        timestamp: news.timestamp,
        message_hash: processedMessage.hash,
        created_at: Date.now(),
        sent_to_groups: '[]'
      });
      
      await telegramBot.broadcastNews(processedMessage);
      console.log('✅ 新闻广播完成');
    } else {
      console.log('⚠️ 重复新闻，跳过');
    }
    
  } catch (error) {
    console.error('❌ 处理新闻失败:', error);
  }
});

// WebSocket连接事件
wsClient.on('connected', () => {
  console.log('🎉 WebSocket连接成功');
});

wsClient.on('error', (error) => {
  console.error('❌ WebSocket错误:', error);
});

// 启动连接
wsClient.connect();

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭...');
  wsClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号');
  wsClient.disconnect();
  process.exit(0);
});

console.log('✅ AlphaNews Bot启动完成，等待新闻推送...');
