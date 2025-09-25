import React from 'react'
import Taro from '@tarojs/taro'
import {View} from '@tarojs/components'
import {getMessages, getSetting, handleRead, clearMessages, transferToManual, getReqId} from "@/api";
import {getToken} from "@/util/auth";
import {isH5, isWeapp} from "@/util/env";
import {MessageSource} from "@/util/index";

import SendContext from './context'
import Input from './components/Input'
import MessageContainer from './components/MessageContainer/index'
import classNames from "classnames";


const pageSize = 30

const Index = () => {

  const [messages, setMessages] = React.useState<APP.Message[]>([])

  const [loading, setLoading] = React.useState(false)

  const [noMore, setNoMore] = React.useState(false)

  const [task, setTask] = React.useState<Taro.SocketTask | undefined>()

  const [waitingCount, setWaitingCount] = React.useState<number>(0)

  const [isWaitingForAgent, setIsWaitingForAgent] = React.useState<boolean>(false)

  const [isConnectedToAgent, setIsConnectedToAgent] = React.useState<boolean>(false)

  const [setting, setSetting] = React.useState<APP.ChatSetting>()

  const [aiBlocked, setAiBlocked] = React.useState<boolean>(false)

  const [hasSentPageInfo, setHasSentPageInfo] = React.useState<boolean>(false)

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

          // 如果有URL和标题，自动发送消息
          if (pageUrl && pageTitle) {
            let message = `页面信息\n标题：${pageTitle}\n链接：${pageUrl}`

            // 添加自定义参数（排除auto_send参数）
            const customParams = Object.keys(params).filter(key =>
              key !== 'auto_send' && params[key] !== undefined && params[key] !== null
            )

            if (customParams.length > 0) {
              message += '\n参数：'
              customParams.forEach(key => {
                message += `\n${key}=${params[key]}`
              })
            }

            // 等待WebSocket连接建立后发送消息
            const sendMessageAfterConnect = () => {
              if (task && task.readyState === 1) { // WebSocket.OPEN = 1
                // 获取req_id
                getReqId().then(res => {
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
                  if (task && task.readyState === 1) {
                    task.send({
                      data: JSON.stringify(action),
                      success: () => {
                        setHasSentPageInfo(true)
                      },
                      fail: (res) => {
                        console.error('自动发送页面信息失败:', res.errMsg)
                      }
                    })
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
        }
      } catch (error) {
        console.error('获取页面信息失败:', error)
      }
    }

    sendPageInfoToAgent()
  }, [task, hasSentPageInfo])

  // 控制滚动条滚动到底部
  const [toTop, setToTop] = React.useState(false)

  const connect = React.useCallback(() => {
    Taro.connectSocket({
      url: `${WS_URL}?token=` + getToken()
    }).then(t => {
      t.onError(() => {
        setTask(undefined)
        Taro.showToast({
          title: '连接服务器失败',
          icon: 'none'
        })
      })
      t.onOpen(() => {
      })
      t.onMessage(result => {
        if (result.data != '') {
          try {
            const action: APP.Action = JSON.parse(result.data)
            switch (action.action) {
              case 'receive-message': {
                const msg = action.data as APP.Message
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
                const data : APP.Receipt = action.data
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
              case "read": {
                const msgIds = action.data as number[]
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
                const count = action.data
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
          }catch (e) {

          }

        }
      })
      t.onClose(() => {
        setTask(undefined)
      })
      setTask(t)
    })

  }, [])

  const init = React.useCallback(() => {
    setNoMore(false)
    // 重置聊天状态
    setIsWaitingForAgent(false)
    setIsConnectedToAgent(false)
    setAiBlocked(false)
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
    return (new Promise((resolve, reject) => {
      if (task) {
        task.send({
          data: JSON.stringify(act),
          success: () => {
            setMessages(prev => {
              return [...[act.data].concat(prev)]
            })
            setToTop(prevState => !prevState)
            resolve(true)
          },
          fail: res => {
            // 检查是否是AI阻塞错误
            if (res.errMsg && res.errMsg.includes('AI正在回复中')) {
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
                title: res.errMsg
              })
            }
            reject(res.errMsg)
          }
        })
      } else {
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
      }
    }))
  }, [connect, task])


  const close = React.useCallback(() => {
    if (isWeapp()) {
      setTask(prevState => {
        if (prevState) {
          Taro.closeSocket().then().catch(() => {
          })
        }
        return undefined
      })
    }
    if (isH5()) {
      setTask(prevState => {
        if (prevState) {
          prevState.ws.close()
        }
        return undefined
      })
    }
  }, [])

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
      Taro.showToast({
        title: '已转接人工客服',
        icon: 'success'
      })
    } catch (error: any) {
      const errorMsg = error?.message || '转接失败'
      Taro.showToast({
        title: errorMsg,
        icon: 'error'
      })
      throw error
    }
  }, [])

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
      ...setting
    }}>
      {
        setting?.is_show_queue  && waitingCount > 0 && <View className={"fixed px-1 h-6 flex items-center w-full text-xs bg-[#fcf6ed] text-[#de8c17]"}>
          前面还有{waitingCount}人在等待
        </View>
      }
      <View className={classNames("flex flex-col justify-between w-full bg-[#f5f5f5] overflow-hidden box-border", {
        "pt-6": setting?.is_show_queue  && waitingCount > 0
      })} style={cusStyles}>
        <View className={"overflow-hidden flex w-full self-end"}>
          {/* 工具栏 */}
          <View className={"flex justify-between px-2 py-1 bg-white border-b"}>
            <View
              className={`text-xs px-2 py-1 rounded border ${
                isWaitingForAgent || isConnectedToAgent
                  ? 'text-gray-300 border-gray-200'
                  : 'text-blue-500 border-blue-300'
              }`}
              onClick={() => {
                if (isWaitingForAgent || isConnectedToAgent) {
                  return; // 已经在等待人工或已连接人工，不允许再次转人工
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
              }}
            >
              {isConnectedToAgent ? '已连接人工' : isWaitingForAgent ? '等待人工中...' : '转人工'}
            </View>
            <View
              className={"text-xs text-gray-500 px-2 py-1 rounded border"}
              onClick={() => {
                Taro.showModal({
                  title: '提示',
                  content: '确定要清除所有聊天记录吗？',
                  success: (res) => {
                    if (res.confirm) {
                      clearMessages().then(() => {
                        // 清除成功后重新初始化聊天状态
                        setMessages([])
                        setNoMore(false)
                        Taro.showToast({
                          title: '清除成功',
                          icon: 'success'
                        })
                      }).catch(() => {
                        Taro.showToast({
                          title: '清除失败',
                          icon: 'error'
                        })
                      })
                    }
                  }
                })
              }}
            >
              清除记录
            </View>
          </View>
          <MessageContainer messages={messages} top={toTop} onScrollTop={getMoreMessage}>
            {
              loading &&
              <View className={"p-1 text-base text-center"}>
                loading...
              </View>
            }
            {
              !loading && noMore && <View className={"text-center py-3 text-xs text-gray-600"}>
                没有更多了
              </View>
            }
          </MessageContainer>
        </View>
        <Input />
      </View>
    </SendContext.Provider>
  )
}

export default Index

