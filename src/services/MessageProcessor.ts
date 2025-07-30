import crypto from 'crypto';
import { BWENewsMessage } from './NewsWebSocketClient';

export interface ProcessedMessage {
  text: string;
  hash: string;
  priority: number;
  coins: string[];
}

export class MessageProcessor {
  
  processNews(news: BWENewsMessage): ProcessedMessage {
    const formattedText = this.formatMessage(news);
    const hash = this.generateHash(news);
    const priority = this.calculatePriority(news);
    
    return {
      text: formattedText,
      hash,
      priority,
      coins: news.coins_included || []
    };
  }

  private formatMessage(news: BWENewsMessage): string {
    const { source_name, news_title, coins_included, url, timestamp } = news;
    
    // 格式化时间
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 格式化币种标签
    const coinTags = coins_included && coins_included.length > 0 
      ? coins_included.map(coin => `#${coin}`).join(' ')
      : '';

    // 生成消息文本
    let message = `🚨 **AlphaNews** 快讯\n\n`;
    message += `📰 ${news_title}\n\n`;
    
    if (coinTags) {
      message += `🪙 相关币种: ${coinTags}\n\n`;
    }
    
    message += `🔗 [查看详情](${url})\n`;
    message += `⏰ ${timeStr}`;

    return message;
  }

  private generateHash(news: BWENewsMessage): string {
    const content = `${news.news_title}${news.timestamp}${news.url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private calculatePriority(news: BWENewsMessage): number {
    let priority = 1;
    
    // 根据标题关键词提升优先级
    const highPriorityKeywords = [
      'SEC', '监管', 'regulation', 'hack', '黑客', 'exploit',
      'Bitcoin', 'BTC', 'Ethereum', 'ETH', '上市', 'listing',
      'breaking', '突发', '重大', 'major'
    ];
    
    const title = news.news_title.toLowerCase();
    for (const keyword of highPriorityKeywords) {
      if (title.includes(keyword.toLowerCase())) {
        priority += 1;
        break;
      }
    }
    
    // 根据涉及币种数量
    if (news.coins_included && news.coins_included.length > 0) {
      priority += Math.min(news.coins_included.length, 3);
    }
    
    return priority;
  }
}
