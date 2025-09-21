import React from 'react'
import {View, Input, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {newAction} from "@/util/action";
import {getToken} from "@/util/auth"
import PictureImg from '@/asset/img/picture.png'
import context from "../../context";
import classNames from "classnames";

const Index = () => {

  const [value, setValue] = React.useState('')

  const [isSending, setIsSending] = React.useState(false)

  const [isIphonex, setIphonex] = React.useState(false)

  React.useEffect(() => {
    setIphonex(() => {
      const model = Taro.getSystemInfoSync().model
      return /iphone\sx/i.test(model) || (/iphone/i.test(model) && /unknown/.test(model)) || /iphone\s11/i.test(model)
         || /iphone\s12/.test(model);
    })
  }, [])


  const action = React.useContext(context)

  // 调试信息
  React.useEffect(() => {
    console.log('🎯 Input组件状态:', {
      ai_block_user_messages: action.ai_block_user_messages,
      aiBlocked: action.aiBlocked,
      isWaitingForAgent: action.isWaitingForAgent,
      isConnectedToAgent: action.isConnectedToAgent,
      shouldShowAiBlock: action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent
    })
  }, [action.ai_block_user_messages, action.aiBlocked, action.isWaitingForAgent, action.isConnectedToAgent])


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

  const handleSend = React.useCallback(async (message: string) => {
    if (!message.trim() || isSending) return

    setIsSending(true)
    try {
      const act = await newAction(message)
      if (action.send) {
        await action.send(act)
        setValue('')

        // 根据后端设置决定是否启用AI阻塞
        // 如果后端启用了AI阻塞，且当前不在等待人工客服状态且未连接到人工客服，前端立即进入阻塞状态
        console.log('📤 发送消息状态检查:', {
          ai_block_user_messages: action.ai_block_user_messages,
          isWaitingForAgent: action.isWaitingForAgent,
          isConnectedToAgent: action.isConnectedToAgent,
          willBlock: action.ai_block_user_messages && !action.isWaitingForAgent && !action.isConnectedToAgent
        })
        if (action.ai_block_user_messages && !action.isWaitingForAgent && !action.isConnectedToAgent) {
          action.setAiBlocked && action.setAiBlocked(true)
          console.log('🚫 设置AI阻塞: true')
        }
      }
    } catch (error: any) {
      // 如果后端也返回阻塞错误，显示提示
      if (error && typeof error === 'string' && error.includes('AI正在回复中')) {
        action.setAiBlocked && action.setAiBlocked(true)
        Taro.showToast({
          title: 'AI正在思考中，请稍等...',
          icon: 'none',
          duration: 2000
        })
        // 3秒后自动解除阻塞状态（作为fallback）
        setTimeout(() => {
          action.setAiBlocked && action.setAiBlocked(false)
        }, 3000)
      }
    } finally {
      setIsSending(false)
    }
  }, [action.send, action.setAiBlocked, action.ai_block_user_messages, isSending])

  return (
    <View className={classNames(`border-t border-solid flex flex-shrink-0 items-center bg-[#F5F6F7]`, {
      "pb-9": isIphonex
    })}>
      <View className={"w-[83%] p-2 text-xl"}>
        <Input cursorSpacing={20}
          value={value}
          disabled={isSending || (action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)}
          placeholder={
            action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent
              ? "AI正在回复中，请稍等..."
              : "请输入消息..."
          }
          className={classNames("bg-white p-1 rounded transition-all", {
            "opacity-50": isSending || (action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent),
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
      <View className={"flex justify-between"}>
        <Image
          src={PictureImg}
          className={classNames("w-8 h-auto flex transition-all", {
            "opacity-50": isSending || (action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)
          })}
          mode='widthFix'
          onClick={() => {
            if (!isSending && !(action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent)) {
              selectImg()
            }
          }}
        />
        {isSending && (
          <View className="ml-2 text-xs text-gray-500 flex items-center">
            发送中...
          </View>
        )}
        {action.ai_block_user_messages && action.aiBlocked && !action.isWaitingForAgent && !action.isConnectedToAgent && (
          <View className="ml-2 text-xs text-orange-500 flex items-center">
            AI思考中
          </View>
        )}
      </View>
    </View>
  )
}

export default Index

