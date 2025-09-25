import React from 'react'
import {Button, View} from "@tarojs/components";
import Taro from "@tarojs/taro"
import {setToken} from "@/util/auth";
import {handleAnonymousLogin} from "@/api";
import { Image } from "@tarojs/components";
import logoImage from '@/asset/img/logo.png'

const Index = () => {

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const anonymousLogin = React.useCallback(() => {
    setLoading(true)
    setError(false)

    handleAnonymousLogin().then(res => {
      console.log('用户名:', res.data.username);
      console.log('JWT令牌:', res.data.token);

      // 保存token到本地存储
      setToken(res.data.token)
      Taro.setStorageSync('user', {
        token: res.data.token, username: res.data.username
      })

      // 跳转到聊天页面
      Taro.navigateTo({
        url: '/pages/index/index'
      })
    }).catch((err) => {
      console.error('匿名登录失败:', err);
      setLoading(false)
      setError(true)
      Taro.showToast({
        icon: 'none',
        title: '登录失败，请重试',
        duration: 3
      })
    })
  }, [])

  // 组件挂载时自动执行匿名登录
  React.useEffect(() => {
    anonymousLogin()
  }, [anonymousLogin])

  return (
    <View className='pt-36'>
      <View className='text-center mb-10'>
        <Image src={logoImage} className={"w-[100px] h-[100px] mx-auto"} />
      </View>
      <View className={"flex items-center flex-col px-[30px]"}>
        {loading && (
          <View className={"text-center"}>
            <View className={"text-gray-600 mb-4"}>正在连接服务器...</View>
            <View className={"animate-pulse text-blue-500"}>
              <View className={"w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"}></View>
            </View>
          </View>
        )}

        {error && (
          <View className={"text-center"}>
            <View className={"text-red-500 mb-4"}>连接失败</View>
            <Button
              className={"bg-blue-500 text-white px-6 py-2 rounded"}
              onClick={anonymousLogin}
            >
              重试连接
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}

export default Index

