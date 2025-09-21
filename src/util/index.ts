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
