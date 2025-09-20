import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"https://chat.lut.icu/api/user"',
    WS_URL: '"ws://chat.lut.icu/api/user/chat/ws"',
    // 定义 Fast Refresh 相关变量以避免未定义错误
    $RefreshReg$: '(() => {})',
    $RefreshSig$: '(() => (type) => type)'
  },
  mini: {},
  h5: {
    publicPath: '/customer/',
    devServer: {
      hot: false,
      liveReload: false
    },
    /**
     * WebpackChain 插件配置
     * @docs https://github.com/neutrinojs/webpack-chain
     */
    webpackChain(chain) {
      // 完全移除 React Fast Refresh 插件
      chain.plugins.delete('react-refresh');

      // 处理 Fast Refresh 相关变量
      chain.plugin('define').tap(args => {
        if (args.length > 0) {
          args[0]['process.env.NODE_ENV'] = JSON.stringify('production');
          args[0]['$RefreshReg$'] = '(() => {})';
          args[0]['$RefreshSig$'] = '(() => (type) => type)';
        }
        return args;
      });
    }
  },
} satisfies UserConfigExport<'webpack5'>
