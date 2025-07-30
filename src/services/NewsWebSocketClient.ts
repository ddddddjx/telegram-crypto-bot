import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface BWENewsMessage {
  source_name: string;
  news_title: string;
  coins_included: string[];
  url: string;
  timestamp: number;
}

export class NewsWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor(wsUrl: string) {
    super();
    this.wsUrl = wsUrl;
  }

  connect(): void {
    try {
      console.log('🔌 正在连接到BWEnews WebSocket...');
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ 成功连接到BWEnews WebSocket');
        this.emit('connected');
        this.startPing();
        this.isReconnecting = false;
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = data.toString();
          
          if (message === 'pong') {
            console.log('🏓 收到服务器pong响应');
            return;
          }

          console.log('📨 收到原始消息:', message);
          
          const newsData: BWENewsMessage = JSON.parse(message);
          console.log('📰 解析后的新闻:', newsData);
          this.emit('news', newsData);
          
        } catch (error) {
          console.error('❌ 解析消息失败:', error);
          console.error('原始消息:', data.toString());
        }
      });

      this.ws.on('close', (code: number, reason: string) => {
        console.log(`🔌 WebSocket连接关闭: ${code} - ${reason}`);
        this.stopPing();
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('❌ WebSocket错误:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('❌ WebSocket连接失败:', error);
      this.scheduleReconnect();
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        console.log('🏓 发送ping到服务器');
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    console.log('🔄 5秒后尝试重连...');
    
    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 正在重连...');
      this.connect();
    }, 5000);
  }

  disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPing();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    console.log('🔌 WebSocket连接已断开');
  }
}
