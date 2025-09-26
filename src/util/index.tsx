import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export function isPhone(phone: string) {
  return /^1[123456789]\d{9}$/.test(phone)
}

// 消息来源类型常量
export const MESSAGE_SOURCES = {
  USER: 0,
  ADMIN: 1,
  SYSTEM: 2,
  AI: 3
} as const

// 消息类型判断函数
export const MessageSource = {
  isUser: (source: number) => source === MESSAGE_SOURCES.USER,
  isAdmin: (source: number) => source === MESSAGE_SOURCES.ADMIN,
  isSystem: (source: number) => source === MESSAGE_SOURCES.SYSTEM,
  isAi: (source: number) => source === MESSAGE_SOURCES.AI,
  getType: (source: number) => {
    switch (source) {
      case MESSAGE_SOURCES.USER: return 'user'
      case MESSAGE_SOURCES.ADMIN: return 'admin'
      case MESSAGE_SOURCES.SYSTEM: return 'system'
      case MESSAGE_SOURCES.AI: return 'ai'
      default: return 'unknown'
    }
  }
}

/**
 * 动态加载任意 URL 的 JS，返回 Promise
 * 成功后 global 上可拿到导出的变量
 */
export function loadScript(src: string): Promise<void> {
  // 检查脚本是否已经加载
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    // 如果脚本已经加载完成或正在加载中
    return new Promise((resolve, reject) => {
      if ((existingScript as HTMLScriptElement).dataset.loaded === 'true') {
        // 脚本已加载完成，直接返回成功
        resolve();
      } else {
        // 脚本正在加载中，监听其加载事件
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => 
          reject(new Error(`load ${src} failed`))
        );
      }
    });
  }
  
  // 创建并加载新脚本
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    // 添加自定义属性标记加载状态
    s.dataset.loaded = 'false';
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error(`load ${src} failed`));
    document.head.appendChild(s);
  });
}

// 解析markdown内容
export const parseMarkdown = (content: string): React.ReactElement => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        // 自定义段落样式
        p: ({ children }) => <span style={{ margin: 0 }}>{children}</span>,
        // 自定义链接样式
        a: ({ children, href }) => (
          <span
            style={{
              color: '#1890ff',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (href) {
                // 在小程序环境中使用Taro的navigateTo或外部链接处理
                // 这里暂时使用window.open作为示例
                if (typeof window !== 'undefined' && window.open) {
                  window.open(href, '_blank');
                }
              }
            }}
          >
            {children}
          </span>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};