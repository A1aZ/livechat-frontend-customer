import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"https://chat.lut.icu/api/user"',
    WS_URL: '"ws://chat.lut.icu/api/user/chat/ws"'
  },
  mini: {},
  h5: {
    publicPath: '/customer/',
    /**
     * WebpackChain 插件配置
     * @docs https://github.com/neutrinojs/webpack-chain
     */
    webpackChain(chain) {
      // 禁用 React Fast Refresh 相关的代码注入
      chain.plugin('react-refresh').tap(args => {
        if (args.length > 0) {
          args[0].overlay = false;
        }
        return args;
      });

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
