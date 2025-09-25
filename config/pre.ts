import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"https://chat-t.zmyyc.com/api/user"',
    WS_URL: '"wss://chat-t.zmyyc.com/api/user/chat/ws"'
  },
  mini: {},
  h5: {
    publicPath: '/customer/',
    webpackChain(chain) {
      // 在pre环境禁用React Fast Refresh
      chain.plugins.delete('reactRefresh')
    }
  },
} satisfies UserConfigExport<'webpack5'>
