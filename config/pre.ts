import type { UserConfigExport } from "@tarojs/cli";
export default {
  defineConstants: {
    BASE_URL: '"https://chat.lut.icu/api/user"',
    WS_URL: '"ws://chat.lut.icu/api/user/chat/ws"'
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
      // 移除所有可能的React Fast Refresh相关插件
      ['react-refresh', 'react-refresh-webpack-plugin', 'react-refresh/babel'].forEach(pluginName => {
        if (chain.plugins.has(pluginName)) {
          chain.plugins.delete(pluginName);
        }
      });

      // 通过webpack配置完全处理Fast Refresh变量
      chain.plugin('define').tap(args => {
        if (args.length > 0) {
          args[0]['process.env.NODE_ENV'] = JSON.stringify('production');
          // 提供完整的Fast Refresh API实现
          args[0]['$RefreshReg$'] = 'function() {}';
          args[0]['$RefreshSig$'] = 'function(type) { return type; }';
          args[0]['__react_refresh_utils__'] = '{}';
          args[0]['__react_refresh_error_overlay__'] = '{}';
          args[0]['__react_refresh_socket__'] = '{}';
        }
        return args;
      });

      // 确保不注入Fast Refresh相关的loader
      chain.module.rule('script')
        .use('babel')
        .tap(options => {
          if (options && options.plugins) {
            // 移除react-refresh/babel插件
            options.plugins = options.plugins.filter(plugin =>
              !plugin || (typeof plugin === 'string' && !plugin.includes('react-refresh'))
            );
          }
          return options;
        });
    }
  },
} satisfies UserConfigExport<'webpack5'>
