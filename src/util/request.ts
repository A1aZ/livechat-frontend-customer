import Taro from '@tarojs/taro'
import { getToken, removeToken } from "./auth"
import { isH5 } from "./env"

function request<T = any>(options: Taro.request.Option & { isLoginRequest?: boolean }): Promise<APP.Resp<T>> {
  if (options.header === undefined) {
    options.header = {}
  }
  const token = getToken()
  options.header.accept = 'application/json'
  if (token) {
    options.header.Authorization = 'Bearer ' + token
  }
  options.url = BASE_URL + options.url
  return Taro.request(options).then(res => {
    // 小程序请求有响应和h5(200)响应都进入这里
    switch (res.statusCode) {
      case 200: {
        if (res.data.success === false) {
          return Promise.reject(res.data)
        } else {
          return Promise.resolve(res.data)
        }
      }
      case 401: {
        removeToken()
        // 如果不是登录请求，才跳转到登录页面，避免死循环
        if (!options.isLoginRequest) {
          // 获取当前页面的参数，并传递给登录页
          let username, user_id, customer_id

          try {
            if (isH5()) {
              // H5环境从URL参数获取
              const urlParams = new URLSearchParams(window.location.search)
              username = urlParams.get('username')
              user_id = urlParams.get('user_id')
              customer_id = urlParams.get('customer_id') || urlParams.get('custom_id')
            } else {
              // 小程序环境从路由参数获取
              const instance = Taro.getCurrentInstance()
              const params = instance.router?.params || {}
              username = params.username
              user_id = params.user_id
              customer_id = params.customer_id || params.custom_id
            }
          } catch (error) {
            console.error('获取URL参数失败:', error)
          }

          // 构建登录页URL参数
          const loginParams: string[] = []
          if (username) loginParams.push(`username=${encodeURIComponent(username)}`)
          if (user_id) loginParams.push(`user_id=${encodeURIComponent(user_id)}`)
          if (customer_id) loginParams.push(`customer_id=${encodeURIComponent(customer_id)}`)

          const loginUrl = loginParams.length > 0
            ? `/pages/login/index?${loginParams.join('&')}`
            : '/pages/login/index'

          console.log('认证失败，将跳转到登录页面，参数:', { username, user_id, customer_id })

          Taro.reLaunch({
            url: loginUrl
          })
        }
        return Promise.reject(res)
      }
      case 404: {
        Taro.showToast({
          title: '数据不见啦！',
          icon: "none",
          mask: true
        }).catch()
        return Promise.reject(res)
      }
      case 422: {
        const { data } = res
        if (data.message) {
          Taro.showToast({
            icon: "none",
            title: data.message
          })
        }
        break
      }
      case 500:
      case 502:
      case 503:
      case 504:
        Taro.showToast({
          title: '服务器发生了点问题',
          icon: "none",
          mask: true
        }).catch()
        return Promise.reject(res)
      default:
        return Promise.reject(res)
    }
  })
}
export default request
