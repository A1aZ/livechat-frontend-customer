import Taro from '@tarojs/taro';
import { getToken } from './auth';

declare const WS_URL: string;

export interface WebSocketMessage {
  action: string;
  data: any;
  time?: number;
}

export interface WebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (data: any) => Promise<boolean>;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  onError: (callback: (error: any) => void) => void;
  onOpen: (callback: () => void) => void;
  onClose: (callback: (code: number) => void) => void;
  forceReconnect: () => Promise<void>;
  isConnected: () => boolean;
  getReadyState: () => number;
}

class TaroWebSocketManager implements WebSocketManager {
  private task: Taro.SocketTask | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3秒
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimer = 30000; // 30秒心跳
  private backgroundKeepAlive = true;
  private isReconnecting = false;

  // 事件回调
  private messageCallback?: (message: WebSocketMessage) => void;
  private errorCallback?: (error: any) => void;
  private openCallback?: () => void;
  private closeCallback?: (code: number) => void;

  constructor() {
    this.updateUrl(); // 动态更新URL
    this.setupPageLifecycle();
  }

  private updateUrl() {
    const currentToken = getToken();
    this.url = `${WS_URL}?token=${currentToken}`;
  }

  private setupPageLifecycle() {
    // 小程序生命周期事件
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      // 小程序前后台切换
      Taro.onAppShow(() => {
        console.log('小程序前台激活');
        if (!this.isConnected() && this.backgroundKeepAlive) {
          this.connect();
        }
      });

      Taro.onAppHide(() => {
        console.log('小程序后台运行');
        // 小程序后台时保持连接，但可以降低心跳频率
        if (this.backgroundKeepAlive) {
          this.adjustHeartbeatForBackground(true);
        }
      });
    }

    // H5环境的页面可见性API
    if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('H5页面变为可见');
          if (!this.isConnected() && this.backgroundKeepAlive) {
            this.connect();
          } else if (this.isConnected()) {
            // 发送ping确认连接有效
            this.sendPing();
          }
          this.adjustHeartbeatForBackground(false);
        } else {
          console.log('H5页面变为后台');
          if (this.backgroundKeepAlive) {
            this.adjustHeartbeatForBackground(true);
          }
        }
      });

      // 页面关闭时清理连接
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  private adjustHeartbeatForBackground(isBackground: boolean) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.isConnected()) {
      this.startHeartbeat(isBackground);
    }
  }

  private startHeartbeat(isBackground = false) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // 后台时延长心跳间隔，前台使用配置的心跳间隔
    const interval = isBackground ? this.heartbeatTimer * 2 : this.heartbeatTimer; // 后台间隔翻倍

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, interval);

    console.log(`心跳启动，间隔: ${interval/1000}秒 (${isBackground ? '后台' : '前台'}模式)`);
  }

  private sendPing() {
    if (this.task && this.isConnected()) {
      this.task.send({
        data: 'ping',
        success: () => {
          console.log('心跳发送成功');
        },
        fail: (error) => {
          console.error('心跳发送失败:', error);
          this.handleConnectionError();
        }
      });
    }
  }

  private handleConnectionError() {
    // 检查token是否存在，如果不存在说明用户未登录，不应该重连
    const currentToken = getToken();
    if (!currentToken) {
      console.log('没有有效token，停止WebSocket重连');
      return;
    }

    if (!this.isReconnecting) {
      this.attemptReconnect();
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      Taro.showToast({
        title: '连接失败，请手动刷新',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`WebSocket重连中... 第${this.reconnectAttempts}次尝试，${delay}ms后重连`);

    setTimeout(async () => {
      try {
        await this.connect();
        this.isReconnecting = false;
      } catch (error) {
        this.isReconnecting = false;
        this.attemptReconnect();
      }
    }, delay);
  }

  async connect(): Promise<void> {
    if (this.task && this.isConnected()) {
      console.log('WebSocket已连接，跳过重连');
      return;
    }

    // 连接前更新URL，确保使用最新的token
    this.updateUrl();

    return new Promise((resolve, reject) => {
      console.log('建立WebSocket连接...', this.url);

      Taro.connectSocket({
        url: this.url
      }).then(task => {
        this.task = task;

        task.onOpen(() => {
          console.log('WebSocket连接已建立');
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          if (this.openCallback) {
            this.openCallback();
          }
          resolve();
        });

        task.onError((error) => {
          console.error('WebSocket连接错误:', error);
          this.task = null;

          if (this.errorCallback) {
            this.errorCallback(error);
          }

          if (this.reconnectAttempts === 0) {
            Taro.showToast({
              title: '连接服务器失败',
              icon: 'none'
            });
          }

          reject(error);
          // 检查是否是认证错误，如果是则不要立即重连
          this.handleConnectionError();
        });

        task.onMessage((result) => {
          if (result.data === 'ping') {
            // 响应服务端ping
            task.send({ data: 'pong' });
            return;
          }

          if (result.data !== '') {
            try {
              const message: WebSocketMessage = JSON.parse(result.data as string);
              if (this.messageCallback) {
                this.messageCallback(message);
              }
            } catch (error) {
              console.error('解析WebSocket消息失败:', error);
            }
          }
        });

        task.onClose((result) => {
          console.log('WebSocket连接关闭, code:', result.code);
          this.task = null;

          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }

          if (this.closeCallback) {
            this.closeCallback(result.code);
          }

          // 非正常关闭时尝试重连
          if (result.code !== 1000 && this.backgroundKeepAlive) {
            this.handleConnectionError();
          }
        });

      }).catch(error => {
        console.error('创建WebSocket连接失败:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    console.log('断开WebSocket连接');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.task) {
      this.task.close({
        code: 1000, // 正常关闭
        reason: 'user disconnect'
      });
      this.task = null;
    }

    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }

  async send(data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.task || !this.isConnected()) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      this.task.send({
        data: JSON.stringify(data),
        success: () => resolve(true),
        fail: (error) => {
          console.error('发送消息失败:', error);
          reject(error);
        }
      });
    });
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    this.messageCallback = callback;
  }

  onError(callback: (error: any) => void) {
    this.errorCallback = callback;
  }

  onOpen(callback: () => void) {
    this.openCallback = callback;
  }

  onClose(callback: (code: number) => void) {
    this.closeCallback = callback;
  }

  isConnected(): boolean {
    return this.task !== null && this.getReadyState() === 1;
  }

  getReadyState(): number {
    if (!this.task) return 3; // CLOSED
    return this.task.readyState || 3;
  }

  // 设置后台保活
  setBackgroundKeepAlive(enabled: boolean) {
    this.backgroundKeepAlive = enabled;
    console.log(`后台保活${enabled ? '已启用' : '已禁用'}`);
  }

  // 强制重新连接（当token更新时）
  async forceReconnect() {
    console.log('强制重新连接WebSocket');
    this.disconnect();
    await this.connect();
  }

  // 获取连接状态信息
  getConnectionInfo() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      backgroundKeepAlive: this.backgroundKeepAlive,
      isReconnecting: this.isReconnecting
    };
  }
}

// 单例模式
let wsManager: TaroWebSocketManager | null = null;

export function getWebSocketManager(): TaroWebSocketManager {
  if (!wsManager) {
    wsManager = new TaroWebSocketManager();
  }
  return wsManager;
}

export default getWebSocketManager;
