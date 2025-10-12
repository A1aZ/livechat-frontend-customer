import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"/api/user"',
    WS_URL: '"ws://localhost:8081/api/user/chat/ws"'
    // WS_URL: '"ws://localhost:8082/api/user/chat/ws"'
  },
  mini: {},
  h5: {},
} satisfies UserConfigExport<'webpack5'>
