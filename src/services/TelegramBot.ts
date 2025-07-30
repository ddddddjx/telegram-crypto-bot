// @ts-ignore - 忽略类型检查
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/DatabaseManager';
import { ProcessedMessage } from './MessageProcessor';

export class CryptoNewsBot {
  private bot: any;
  private db: DatabaseManager;

  constructor(token: string, db: DatabaseManager) {
    this.bot = new TelegramBot(token, { polling: true });
    this.db = db;
    this.setupCommands();
    console.log('🤖 AlphaNews Telegram Bot已启动');
  }

  private setupCommands(): void {
    // 启动命令
    this.bot.onText(/\/start/, async (msg: any) => {
      const chatId = msg.chat.id.toString();
      const chatTitle = msg.chat.title || msg.chat.first_name || 'Unknown';
      
      try {
        await this.db.registerChat(chatId, chatTitle);
        
        const welcomeMessage = `
🚨 **欢迎使用AlphaNews Bot！**

本Bot将为您提供：
- 📊 实时加密货币新闻推送
- 🎯 智能消息过滤和分类
- 🔔 重要新闻优先通知

**可用命令：**
/start - 开始使用Bot
/status - 查看订阅状态
/filter [币种] - 设置币种过滤（如: /filter BTC ETH）
/unfilter - 移除所有过滤器
/stop - 停止接收消息
/help - 查看帮助信息

Bot已激活，开始接收新闻推送！🚀
        `;
        
        await this.bot.sendMessage(chatId, welcomeMessage, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
        
      } catch (error) {
        console.error('❌ /start命令错误:', error);
        await this.bot.sendMessage(chatId, '❌ 启动失败，请稍后重试');
      }
    });

    // 状态查询
    this.bot.onText(/\/status/, async (msg: any) => {
      const chatId = msg.chat.id.toString();
      
      try {
        const chats = await this.db.getActiveChats();
        const currentChat = chats.find(chat => chat.chat_id === chatId);
        
        if (!currentChat) {
          await this.bot.sendMessage(chatId, '❌ 当前群组未注册，请使用 /start 命令');
          return;
        }
        
        const filters = JSON.parse(currentChat.filters || '[]');
        const statusMessage = `
📊 **AlphaNews 订阅状态**

✅ 状态: ${currentChat.is_active ? '已激活' : '已暂停'}
🎯 过滤器: ${filters.length > 0 ? filters.join(', ') : '无'}
📅 注册时间: ${new Date(currentChat.created_at).toLocaleString('zh-CN')}

Bot正在正常运行！
        `;
        
        await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('❌ /status命令错误:', error);
        await this.bot.sendMessage(chatId, '❌ 查询状态失败');
      }
    });

    // 设置过滤器
    this.bot.onText(/\/filter (.+)/, async (msg: any, match: any) => {
      const chatId = msg.chat.id.toString();
      const filterInput = match?.[1];
      
      if (!filterInput) {
        await this.bot.sendMessage(chatId, '❌ 请指定要过滤的币种，例如: /filter BTC ETH SOL');
        return;
      }
      
      try {
        const coins = filterInput.split(' ')
          .map((coin: string) => coin.toUpperCase().trim())
          .filter((coin: string) => coin.length > 0);
        
        await this.db.updateChatFilters(chatId, coins);
        
        const message = `
✅ **过滤器已更新**

🎯 当前过滤币种: ${coins.join(', ')}

现在只会接收包含这些币种的新闻推送。
使用 /unfilter 可以移除所有过滤器。
        `;
        
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('❌ /filter命令错误:', error);
        await this.bot.sendMessage(chatId, '❌ 设置过滤器失败');
      }
    });

    // 移除过滤器
    this.bot.onText(/\/unfilter/, async (msg: any) => {
      const chatId = msg.chat.id.toString();
      
      try {
        await this.db.updateChatFilters(chatId, []);
        await this.bot.sendMessage(chatId, '✅ 已移除所有过滤器，将接收所有新闻推送');
      } catch (error) {
        console.error('❌ /unfilter命令错误:', error);
        await this.bot.sendMessage(chatId, '❌ 移除过滤器失败');
      }
    });

    // 停止服务
    this.bot.onText(/\/stop/, async (msg: any) => {
      const chatId = msg.chat.id.toString();
      
      try {
        await this.db.deactivateChat(chatId);
        await this.bot.sendMessage(chatId, '⏹️ 已停止新闻推送。使用 /start 可重新激活');
      } catch (error) {
        console.error('❌ /stop命令错误:', error);
        await this.bot.sendMessage(chatId, '❌ 停止服务失败');
      }
    });

    // 帮助信息
    this.bot.onText(/\/help/, async (msg: any) => {
      const helpMessage = `
🤖 **AlphaNews Bot帮助**

**命令列表：**
/start - 激活Bot并开始接收新闻
/status - 查看当前订阅状态
/filter [币种] - 设置币种过滤器
  例如: /filter BTC ETH SOL
/unfilter - 移除所有过滤器
/stop - 暂停新闻推送
/help - 显示此帮助信息

**特性说明：**
- 📊 实时接收BWEnews独家新闻
- 🎯 支持按币种过滤新闻
- 🔔 重要新闻自动置顶
- 🚫 智能去重，避免重复推送

如有问题，请联系管理员。
      `;
      
      await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    });

    // 错误处理
    this.bot.on('polling_error', (error: any) => {
      console.error('❌ Telegram Bot轮询错误:', error);
    });
  }

  async broadcastNews(processedMessage: ProcessedMessage): Promise<void> {
    try {
      const activeChats = await this.db.getActiveChats();
      console.log(`📤 准备广播消息到 ${activeChats.length} 个群组`);
      
      for (const chat of activeChats) {
        try {
          // 检查过滤器
          const filters = JSON.parse(chat.filters || '[]');
          if (filters.length > 0) {
            const hasMatchingCoin = processedMessage.coins.some((coin: string) => 
              filters.includes(coin.toUpperCase())
            );
            if (!hasMatchingCoin) {
              console.log(`⏭️ 跳过群组 ${chat.chat_title}（过滤器不匹配）`);
              continue;
            }
          }
          
          await this.bot.sendMessage(chat.chat_id, processedMessage.text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });
          
          console.log(`✅ 发送新闻到群组: ${chat.chat_title}`);
          
          // 避免触发Telegram限流
          await this.sleep(100);
          
        } catch (error) {
          console.error(`❌ 发送到群组 ${chat.chat_id} 失败:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ 广播新闻错误:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
