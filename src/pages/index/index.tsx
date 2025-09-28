import React, { useMemo } from 'react'
import Taro from '@tarojs/taro'
import {View} from '@tarojs/components'
import {getMessages, getSetting, handleRead, transferToManual, getReqId, getStatus} from "@/api";
import {isH5, isWeapp} from "@/util/env";
import {MessageSource} from "@/util/index"
import getWebSocketManager, { WebSocketMessage } from '@/util/websocket'

import SendContext from './context'
import Input from './components/Input'
import MessageContainer from './components/MessageContainer/index'
import ConnectionStatus from '@/components/ConnectionStatus'
import classNames from "classnames";

const pageSize = 30

const Index = () => {

  const [messages, setMessages] = React.useState<APP.Message[]>([])

  const [loading, setLoading] = React.useState(false)

  const [noMore, setNoMore] = React.useState(false)

  // 使用新的WebSocket管理器
  const wsManager = React.useMemo(() => getWebSocketManager(), [])
  const [isConnected, setIsConnected] = React.useState(false)

  const [waitingCount, setWaitingCount] = React.useState<number>(0)

  const [isWaitingForAgent, setIsWaitingForAgent] = React.useState<boolean>(false)

  const [isConnectedToAgent, setIsConnectedToAgent] = React.useState<boolean>(false)

  const [setting, setSetting] = React.useState<APP.ChatSetting>()

  const [aiBlocked, setAiBlocked] = React.useState<boolean>(false)

  const [hasSentPageInfo, setHasSentPageInfo] = React.useState<boolean>(false)

  // 计算当前客服状态
  const serviceStatus = React.useMemo(() => {
    if (isConnectedToAgent) {
      return 'manual-serving' as const // 人工接待中
    } else if (isWaitingForAgent) {
      return 'transferring-to-manual' as const // 转接人工中
    } else {
      return 'ai-serving' as const // AI接待中
    }
  }, [isConnectedToAgent, isWaitingForAgent])

  // 暴露AI阻塞状态管理方法
  const handleSetAiBlocked = React.useCallback((blocked: boolean) => {
    setAiBlocked(blocked)
  }, [])



  React.useEffect(() => {
    getSetting().then(r => {
      setSetting(r.data)
    })
  }, [])

  // 获取页面信息和自动发送消息
  React.useEffect(() => {
    const sendPageInfoToAgent = async () => {
      try {
        const instance = Taro.getCurrentInstance()
        const params = instance.router?.params || {}

        // 检查是否有auto_send参数（自动发送页面信息给客服）
        if ((params.auto_send === '1' || params.auto_send === 'true') && !hasSentPageInfo) {
          // 获取页面URL和标题
          let pageUrl = ''
          let pageTitle = ''

          if (isH5()) {
            pageUrl = window.location.href
            pageTitle = document.title || '页面'
          } else if (isWeapp()) {
            // 小程序中构造URL
            const pages = Taro.getCurrentPages()
            const currentPage = pages[pages.length - 1]
            if (currentPage) {
              pageUrl = `/${currentPage.route}`
              // 小程序中可以尝试从页面配置获取标题，或者使用默认值
              pageTitle = currentPage.config?.navigationBarTitleText || '客服聊天页面'
            }
          }

          // 自动发送消息，即使没有URL和标题也要发送
          let message = `页面信息`

          if (pageTitle) {
            message += `\n标题：${pageTitle}`
          } else {
            message += `\n标题：未知页面`
          }

          if (pageUrl) {
            message += `\n链接：${pageUrl}`
          } else {
            message += `\n链接：未知链接`
          }

            // 添加自定义参数
            const customParams = JSON.parse(decodeURIComponent(params.msgData || '{}'))
            console.log('customParams', customParams)
            if(Object.keys(customParams).length>0) {
              message += '\n参数：'
            }
            Object.keys(customParams).forEach(key => {
              message += `\n${key}=${customParams[key]}`
            })

            console.log('message', message)

          // 等待WebSocket连接建立后发送消息
          const sendMessageAfterConnect = () => {
              if (wsManager.isConnected()) {
                // 获取req_id
                getReqId().then(async res => {
                  const action = {
                    data: {
                      admin_id: 0,
                      content: message,
                      type: 'page-info' as const,
                      req_id: res.data.req_id,
                      source: 0,
                      avatar: '',
                      received_at: Math.floor(Date.now() / 1000),
                      success: undefined,
                    },
                    time: Math.floor(Date.now() / 1000),
                    action: 'send-message',
                  }
                  // 对于自动发送的消息，直接通过WebSocket发送，不添加到本地消息列表
                  try {
                    await wsManager.send(action)
                    setHasSentPageInfo(true)
                  } catch (error) {
                    console.error('自动发送页面信息失败:', error)
                  }
                }).catch(error => {
                  console.error('获取req_id失败:', error)
                })
              } else {
                // 如果连接还没建立，稍后再试
                setTimeout(sendMessageAfterConnect, 500)
              }
            }

          // 延迟执行，确保组件已完全初始化
          setTimeout(sendMessageAfterConnect, 2000)
        }
      } catch (error) {
        console.error('获取页面信息失败:', error)
      }
    }

    sendPageInfoToAgent()
  }, [wsManager, hasSentPageInfo])

  // 获取状态显示文本
  const getStatusText = React.useCallback(() => {
    switch (serviceStatus) {
      case 'ai-serving':
        return aiBlocked ? 'AI思考中...' : 'AI接待中'
      case 'transferring-to-manual':
        return `转接人工中... 前面还有${waitingCount}人`
      case 'manual-serving':
        return '人工接待中'
      default:
        return 'AI接待中'
    }
  }, [serviceStatus, aiBlocked])

  // 控制滚动条滚动到底部
  const [toTop, setToTop] = React.useState(false)


  // 向外层 uniapp 传递 token
  // loadScript(UNI_SDK_URL).then(()=>{
  const user = Taro.getStorageSync('user')
  console.log('postMessage user', user)
  try {
    // 小程序环境
    if (typeof (globalThis as any).uni !== 'undefined') {
      (globalThis as any).uni.postMessage({
        data: user
      })
    }
    // H5环境
    if (typeof window !== 'undefined') {
      window.postMessage({
        data: user
      })
    }
  } catch(e) {
    console.log('postMessage user error', e)
  }
  // })

  // WebSocket消息处理
  const handleWebSocketMessage = React.useCallback((message: WebSocketMessage) => {
    switch (message.action) {
      case 'receive-message': {
        const msg = message.data as APP.Message
        if (msg.id) {
          handleRead(msg.id).then().catch()
        }
        setMessages(prev => {
          return [msg].concat(prev)
        })
        if (msg.admin_id > 0) { // 说明已被接入
          setWaitingCount(0)
          setIsWaitingForAgent(false) // 人工客服接手，结束等待状态
          setIsConnectedToAgent(true) // 标记已连接到人工客服
          setAiBlocked(false) // 转接人工时也要清除AI阻塞状态
        }
        // 如果收到AI消息，解除阻塞状态
        if (MessageSource.isAi(msg.source)) {
          setAiBlocked(false)
        }
        setToTop(prevState => !prevState)
        break
      }
      case "receipt": {
        const data: APP.Receipt = message.data
        setMessages(prevState => {
          for (const x of prevState) {
            if (x.req_id === data.req_id) {
              x.id = data.msg_id;
              x.success = true;
              x.is_read = false;
            }
          }
          return [...prevState]
        });
        break;
      }
      case "status-update": {
        const data = message.data as {
          is_waiting_for_agent: boolean,
          is_connected_to_agent: boolean,
          ai_blocked: boolean,
          waiting_count: number
        }
        setIsWaitingForAgent(data.is_waiting_for_agent)
        setIsConnectedToAgent(data.is_connected_to_agent)
        setAiBlocked(data.ai_blocked)
        setWaitingCount(data.waiting_count)
        break;
      }
      case "read": {
        const msgIds = message.data as number[]
        setMessages(prevState => {
          for (const x of prevState) {
            if (msgIds.includes(x.id as number)) {
              x.is_read = true
            }
          }
          return [...prevState]
        })
        break;
      }
      case "waiting-user-count": {
        const count = message.data
        setWaitingCount(count)
        // 收到等待人数消息时，标记用户正在等待人工客服，并清除AI阻塞状态
        setIsWaitingForAgent(true)
        setAiBlocked(false)
        break
      }
      case "ai-block": {
        setAiBlocked(true)
        break
      }
      case "ai-unblock": {
        setAiBlocked(false)
        break
      }
    }
  }, [])

  const connect = React.useCallback(async () => {
    try {
      await wsManager.connect()
      setIsConnected(true)
      console.log('WebSocket连接成功')
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      setIsConnected(false)
    }
  }, [wsManager])

  // 设置WebSocket事件监听
  React.useEffect(() => {
    wsManager.onMessage(handleWebSocketMessage)

    wsManager.onOpen(() => {
      setIsConnected(true)
      console.log('WebSocket连接已建立')
    })

    wsManager.onClose((code) => {
      setIsConnected(false)
      console.log('WebSocket连接已关闭, code:', code)
      // WebSocket连接断开时重置相关状态
      if (code !== 1000) { // 非正常关闭
        setIsWaitingForAgent(false)
        setIsConnectedToAgent(false)
        setAiBlocked(false)
        setWaitingCount(0)
      }
    })

    wsManager.onError((error) => {
      console.error('WebSocket连接错误:', error)
      setIsConnected(false)
    })
  }, [wsManager, handleWebSocketMessage])

  const init = React.useCallback(() => {
    setNoMore(false)
    // 重置聊天状态
    setIsWaitingForAgent(false)
    setIsConnectedToAgent(false)
    setAiBlocked(false)

    // 先获取当前状态
    getStatus().then(statusRes => {
      const status = statusRes.data
      setIsWaitingForAgent(status.is_waiting_for_agent)
      setIsConnectedToAgent(status.is_connected_to_agent)
      setAiBlocked(status.ai_blocked)
      setWaitingCount(status.waiting_count)
    }).catch(() => {
      // 如果获取状态失败，使用默认状态
    })

    // 然后获取消息
    getMessages(pageSize,).then(res => {
      if (res.data.length < pageSize) {
        setNoMore(true)
      }
      setMessages(res.data)
      connect()
    }).catch(() => {
    })
  }, [connect])


  const send = React.useCallback((act: APP.Action): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      if (!isConnected) {
        Taro.showModal({
          title: '提示',
          content: '聊天服务器已断开',
          confirmText: '重新连接'
        }).then(res => {
          if (res.confirm) {
            connect()
          }
        })
        reject("服务器已断开")
        return
      }

      try {
        await wsManager.send(act)
        setMessages(prev => {
          return [...[act.data].concat(prev)]
        })
        setToTop(prevState => !prevState)
        resolve(true)
      } catch (error: any) {
        // 检查是否是AI阻塞错误
        if (error.message && error.message.includes('AI正在回复中')) {
          setAiBlocked(true)
          Taro.showToast({
            title: 'AI正在思考中，请稍等...',
            icon: 'none',
            duration: 2000
          })
          // 3秒后自动解除阻塞状态（作为fallback）
          setTimeout(() => {
            setAiBlocked(false)
          }, 3000)
        } else {
          Taro.showToast({
            icon: 'none',
            title: error.message || '发送失败'
          })
        }
        reject(error.message || '发送失败')
      }
    })
  }, [connect, wsManager, isConnected])


  const close = React.useCallback(() => {
    wsManager.disconnect()
    setIsConnected(false)
  }, [wsManager])

  React.useEffect(() => {
    if (isH5()) {
      window.onresize = () => {
        window.location.reload()
      }
    }
  }, [])


  React.useEffect(() => {
    init()
    return () => {
      close()
    }
  }, [close, init])


  const fetchLock = React.useRef(false)

  const handleTransferToManual = React.useCallback(async () => {
    try {
      await transferToManual()
      // API调用成功后立即更新状态，确保用户体验
      setIsWaitingForAgent(true)
      setAiBlocked(false)
      Taro.showToast({
        title: '已转接人工客服',
        icon: 'success'
      })
    } catch (error: any) {
      const errorMsg = error?.message || '转接失败'

      // 如果是"已在人工队列中"的错误，说明用户已经在等待人工了
      // 这种情况下不显示错误，而是更新状态
      if (errorMsg.includes('已在人工队列中')) {
        setIsWaitingForAgent(true)
        setAiBlocked(false)
        Taro.showToast({
          title: '正在等待人工客服',
          icon: 'success'
        })
        return
      }

      Taro.showToast({
        title: errorMsg,
        icon: 'error'
      })
      throw error
    }
  }, [])

  const connectService = () => {
    // 只有在AI接待中且AI未阻塞时才能转人工
    if (serviceStatus !== 'ai-serving' || aiBlocked) {
      return;
    }
    Taro.showModal({
      title: '提示',
      content: '确定要转接人工客服吗？',
      success: (res) => {
        if (res.confirm) {
          handleTransferToManual().catch(() => {})
        }
      }
    })
  }

  const getMoreMessage = React.useCallback(async () => {
    if (!fetchLock.current && !noMore) {
      fetchLock.current = true
      setLoading(true)
      if (messages.length > 0) {
        const id = messages[messages.length - 1].id
        if (id) {
          try {
            const res = await getMessages(pageSize, id)
            setMessages(prevState => {
              setLoading(false)
              return [...prevState.concat(res.data)]
            })
            if (res.data.length < pageSize) {
              setNoMore(true)
            }
            fetchLock.current = false
          } catch (e) {
          }
        }
      }
    }
  }, [loading, messages, noMore])

  // h5模式下，用手机内置的浏览器打开100vh并不是实际的高度
  const cusStyles = React.useMemo(() => {
    if (isH5()) {
      return {
        height: window.innerHeight + "px"
      }
    }
    if (isWeapp()) {
      return {
        height: "100vh"
      }
    }
    return {}
  }, [])

  // 注意：safeAreaStyle相关代码已被注释，如需要可以重新启用

  const recent = useMemo(() => {
      return (
        <View className="flex h-full justify-center items-center mt-2">
            <View className="text-sm text-gray-500">
              {getStatusText()}
            </View>
        </View>
      )
  }, [serviceStatus, aiBlocked])

  return (
    <SendContext.Provider value={{
      send,
      setAiBlocked: handleSetAiBlocked,
      aiBlocked,
      waitingCount,
      isWaitingForAgent,
      isConnectedToAgent,
      ai_block_user_messages: setting?.ai_block_user_messages,
      transferToManual: handleTransferToManual,
      serviceStatus,
      ...setting
    }}>
      {/* {
        setting?.is_show_queue  && waitingCount > 0 && <View className={"fixed px-1 h-6 flex items-center w-full text-xs bg-[#fcf6ed] text-[#de8c17]"}>
          前面还有{waitingCount}人在等待
        </View>
      } */}
      <View className={classNames("flex flex-col justify-between w-full bg-[#f5f5f5] overflow-hidden box-border")} style={cusStyles}>
        {/* 连接状态指示器 */}
        <ConnectionStatus className="absolute top-2 right-2 z-10" />

        {/* 顶部状态栏 */}
        {/* <View className={styles["top-status"]} style={safeAreaStyle}>
          <View className="flex h-full justify-center items-center">
            <View className="text-sm font-medium text-white">
              {getStatusText()}
            </View>
          </View>
        </View> */}

        <View className={"overflow-hidden flex w-full self-end"}>
          <MessageContainer messages={messages} recent={recent} top={toTop} onScrollTop={getMoreMessage}>
            {/* {
              loading &&
              <View className={"p-1 text-base text-center"}>
                loading...
              </View>
            } */}
            {/* {
              !loading && noMore && <View className={"text-center py-3 text-xs text-gray-600"}>
                没有更多了
              </View>
            } */}
          </MessageContainer>
        </View>
        <Input setMessages={setMessages} setNoMore={setNoMore} connectService={connectService} />
      </View>
    </SendContext.Provider>
  )
}

export default Index

