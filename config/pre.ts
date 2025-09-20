import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"https://chat.lut.icu/api/user"',
    WS_URL: '"ws://chat.lut.icu/api/user/chat/ws"'
  },
  mini: {},
  h5: {
    publicPath: '/customer/',
  },
} satisfies UserConfigExport<'webpack5'>
