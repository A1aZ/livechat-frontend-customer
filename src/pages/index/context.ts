import React from "react";

// 定义客服状态类型
export type ServiceStatus = 'ai-serving' | 'transferring-to-manual' | 'manual-serving';

const context = React.createContext<{
  send: ((a: APP.Action) => Promise<boolean>) | undefined,
  is_show_queue?: boolean,
  is_show_read?: boolean,
  ai_block_user_messages?: boolean,
  aiBlocked?: boolean,
  waitingCount?: number,
  isWaitingForAgent?: boolean,
  isConnectedToAgent?: boolean,
  setAiBlocked?: (blocked: boolean) => void,
  transferToManual?: () => Promise<void>,
  serviceStatus?: ServiceStatus
}>({
  send: undefined,
  is_show_queue: false,
  is_show_read: false,
  ai_block_user_messages: false,
  aiBlocked: false,
  waitingCount: 0,
  isWaitingForAgent: false,
  isConnectedToAgent: false,
  setAiBlocked: undefined,
  transferToManual: undefined,
  serviceStatus: 'ai-serving'
})

export default context
