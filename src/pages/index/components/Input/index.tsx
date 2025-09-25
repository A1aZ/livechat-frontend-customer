import React from 'react'
import {View, Input, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {newAction} from "@/util/action";
import {getToken} from "@/util/auth"
import {clearMessages} from "@/api";
import PictureImg from '@/asset/img/picture.svg'
import serviceImg from '@/asset/img/service.svg'
import clearImg from '@/asset/img/clear.svg'
import PlusImg from '@/asset/img/more.svg'
import context from "../../context";
import classNames from "classnames";

const Index = ({setMessages, setNoMore}) => {

  const [value, setValue] = React.useState('')

  const [isSending, setIsSending] = React.useState(false)

  const [isIphonex, setIphonex] = React.useState(false)

  const [showPanel, setShowPanel] = React.useState(false)

  React.useEffect(() => {
    setIphonex(() => {
      const model = Taro.getSystemInfoSync().model
      return /iphone\sx/i.test(model) || (/iphone/i.test(model) && /unknown/.test(model)) || /iphone\s11/i.test(model)
         || /iphone\s12/.test(model);
    })
  }, [])


  const action = React.useContext(context)



  const selectImg = React.useCallback(() => {
    Taro.chooseImage({}).then(res => {
      res.tempFilePaths.forEach(path => {
        Taro.uploadFile({
          header: {
            Authorization: 'Bearer ' + getToken()
          },
          name: "file",
          url: BASE_URL + "/chat/files",
          filePath: path
        }).then(r => {
          const result: APP.Resp<APP.File> = JSON.parse(r.data)
          if (result.success) {
            newAction(result.data.url, 'image').then(act => {
              action.send && action.send(act).then().catch()
            })
          }
        })
      })
    })
  }, [action.send])

  const handleClearMessages = React.useCallback(() => {
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
  }, [])

  const handleConnectAgent = React.useCallback(() => {
    Taro.showModal({
      title: '人工客服',
      content: '是否要转接人工客服？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以添加转接人工客服的逻辑
          Taro.showToast({
            title: '正在转接人工客服...',
            icon: 'none'
          })
        }
      }
    })
  }, [])

  const handleSend = React.useCallback(async (message: string) => {
    if (!message.trim() || isSending) return

    setIsSending(true)
    try {
      const act = await newAction(message)
      if (action.send) {
        await action.send(act)
        setValue('')
        // 不再预判阻塞，等待后端发送明确的阻塞信号
      }
    } catch (error: any) {
      // 处理其他错误（阻塞相关的错误现在由信号处理）
      if (error && typeof error === 'string' && !error.includes('AI正在回复中')) {
        Taro.showToast({
          icon: 'none',
          title: error
        })
      }
      throw error
    } finally {
      setIsSending(false)
    }
  }, [action.send, action.setAiBlocked, action.ai_block_user_messages, isSending])

  return (
    <View>
    <View className={classNames(`border-t border-solid flex flex-shrink-0 items-center bg-[#F5F6F7] relative`, {
      "pb-9": isIphonex
    })}>
      {/* 输入区域 */}
      <View className={"w-[83%] p-2 text-base"}>
        <Input cursorSpacing={20}
          value={value}
          disabled={isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)}
          placeholder={
            action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent
              ? "AI正在回复中，请稍等..."
              : "请输入消息..."
          }
          className={classNames("bg-white p-2 rounded transition-all", {
            "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent),
            "bg-gray-100": action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent
          })}
          onInput={e => setValue(e.detail.value)}
          confirmHold
          onConfirm={e => {
            if (e.detail.value.length > 0 && !isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
              handleSend(e.detail.value)
            }
          }}
        />
      </View>
      
      {/* 右侧功能区 */}
      <View className={"flex flex-col items-center"}>
        <Image
          src={PlusImg}
          className={classNames("w-8 h-auto transition-all", {
            "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent),
            "rotate-45": showPanel
          })}
          mode='widthFix'
          onClick={() => {
            if (!isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
              setShowPanel(!showPanel)
            }
          }}
        />
        
        {isSending && (
          <View className="mt-1 text-xs text-gray-500">
            发送中...
          </View>
        )}
        {action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent && (
          <View className="mt-1 text-xs text-orange-500">
            AI思考中
          </View>
        )}
      </View>
      
      {/* 点击空白处关闭面板 */}
      {showPanel && (
        <View 
          className="fixed inset-0 z-9"
          onClick={() => setShowPanel(false)}
        />
      )}
    </View>

      {/* 折叠面板 */}
      {showPanel && (
        <View 
          className="position-relative z-10 bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-2 flex justify-around items-center"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {/* 图片上传 */}
          <View 
            className="flex flex-col items-center p-2 rounded-lg active:bg-gray-100"
            onClick={() => {
              if (!isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
                selectImg()
                setShowPanel(false)
              }
            }}
          >
            <Image
              src={PictureImg}
              className={classNames("w-8 h-auto", {
                "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)
              })}
              mode='widthFix'
            />
            <View className="text-xs text-gray-600 mt-1">图片</View>
          </View>
          
          {/* 清除记录 */}
          <View 
            className="flex flex-col items-center p-2 rounded-lg active:bg-gray-100"
            onClick={() => {
              if (!isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
                handleClearMessages()
                setShowPanel(false)
              }
            }}
          >
            <Image
              src={clearImg}
              className={classNames("w-8 h-auto", {
                "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)
              })}
              mode='widthFix'
            />
            <View className="text-xs text-gray-600 mt-1">清除记录</View>
          </View>
          
          {/* 人工客服 */}
          <View 
            className="flex flex-col items-center p-2 rounded-lg active:bg-gray-100"
            onClick={() => {
              if (!isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
                handleConnectAgent()
                setShowPanel(false)
              }
            }}
          >
            
            <Image
              src={serviceImg}
              className={classNames("w-8 h-auto", {
                "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)
              })}
              mode='widthFix'
            />
            <View className="text-xs text-gray-600 mt-1">人工客服</View>
          </View>
        </View>
      )}
      
    </View>
  )
}

export default Index

