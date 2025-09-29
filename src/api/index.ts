import request from "../util/request";

export const handleLogin = (data) => {
  return request<{token: string}>({
    url: '/login',
    method: 'POST',
    data
  })
}

export const handleAnonymousLogin = (data?: {username?: string, user_id?: string}) => {
  return request<{username: string, token: string}>({
    url: '/anonymous-login',
    method: 'POST',
    data: data || {},
    header: {
      'Content-Type': 'application/json'
    },
    isLoginRequest: true
  })
}
export const getReqId = () => {
  return request<{req_id: string}>({
    url: "/chat/req-id",
    method: "GET"
  })
}

export const getMessages = ( size = 20, id?: number) => {
  const data = {
    pageSize: size,
  }
  if (id !== undefined) {
    data['id'] = id
  }
  return request<APP.Message[]>({
    url: '/chat/messages',
    data
  })
}


export const getSetting = ( ) => {
  return request<APP.ChatSetting>({
    url: '/chat/setting',
  })
}

export const handleRead = (msgId: number) => {
  return request({
    url: '/chat/read',
    method:"POST",
    data: {
      msg_id: msgId,
    }
  })
}

export const clearMessages = () => {
  return request({
    url: '/chat/messages',
    method: 'DELETE'
  })
}

export const transferToManual = () => {
  return request({
    url: '/chat/transfer-manual',
    method: 'POST'
  })
}

export const getStatus = () => {
  return request<{
    is_waiting_for_agent: boolean,
    is_connected_to_agent: boolean,
    ai_blocked: boolean,
    waiting_count: number
  }>({
    url: '/chat/status',
    method: 'GET'
  })
}
