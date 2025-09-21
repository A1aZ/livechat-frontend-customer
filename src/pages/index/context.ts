import React from "react";

const context = React.createContext<{
  send: ((a: APP.Action) => Promise<boolean>) | undefined,
  is_show_queue?: boolean,
  is_show_read?: boolean,
  ai_block_user_messages?: boolean,
  aiBlocked?: boolean,
  waitingCount?: number,
  isWaitingForAgent?: boolean,
  isConnectedToAgent?: boolean,
  setAiBlocked?: (blocked: boolean) => void
}>({
  send: undefined,
  is_show_queue: false,
  is_show_read: false,
  ai_block_user_messages: false,
  aiBlocked: false,
  waitingCount: 0,
  isWaitingForAgent: false,
  isConnectedToAgent: false,
  setAiBlocked: undefined
})

export default context
