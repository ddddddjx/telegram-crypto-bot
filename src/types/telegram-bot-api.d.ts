declare module 'node-telegram-bot-api' {
  interface SendMessageOptions {
    parse_mode?: 'Markdown' | 'HTML';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
  }

  interface Message {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      first_name?: string;
    };
    date: number;
    text?: string;
  }

  class TelegramBot {
    constructor(token: string, options?: { polling?: boolean });
    
    sendMessage(chatId: string | number, text: string, options?: SendMessageOptions): Promise<Message>;
    
    onText(regexp: RegExp, callback: (msg: Message, match?: RegExpExecArray | null) => void): void;
    
    on(event: string, callback: (error: Error) => void): void;
  }

  export = TelegramBot;
}
