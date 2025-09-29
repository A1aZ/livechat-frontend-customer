import React from 'react';
import { View, Text } from '@tarojs/components';
import getWebSocketManager from '@/util/websocket';
import classNames from 'classnames';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const [connectionInfo, setConnectionInfo] = React.useState({
    connected: false,
    reconnectAttempts: 0,
    backgroundKeepAlive: true,
    isReconnecting: false,
    isConnecting: false, // 新增：正在连接状态
    hasStartedConnecting: false // 新增：连接过程是否已经开始
  });

  const wsManager = React.useMemo(() => getWebSocketManager(), []);

  // 定期更新连接状态
  React.useEffect(() => {
    const updateStatus = () => {
      setConnectionInfo(wsManager.getConnectionInfo());
    };

    // 立即更新一次
    updateStatus();

    // 每2秒更新一次状态
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, [wsManager]);

  const getStatusText = () => {
    if (connectionInfo.isReconnecting) {
      return `重连中(${connectionInfo.reconnectAttempts})`;
    }
    if (connectionInfo.isConnecting || (!connectionInfo.connected && connectionInfo.hasStartedConnecting)) {
      return '连接中...';
    }
    return connectionInfo.connected ? '已连接' : '待连接';
  };

  const getStatusColor = () => {
    if (connectionInfo.isReconnecting) {
      return '#faad14'; // 橙色
    }
    if (connectionInfo.isConnecting || (!connectionInfo.connected && connectionInfo.hasStartedConnecting)) {
      return '#1890ff'; // 蓝色
    }
    return connectionInfo.connected ? '#52c41a' : '#ff4d4f'; // 绿色或红色
  };

  // 只在开发环境、连接异常或正在连接时显示
  const shouldShow = process.env.NODE_ENV === 'development' ||
                    !connectionInfo.connected ||
                    connectionInfo.isReconnecting ||
                    connectionInfo.isConnecting ||
                    (!connectionInfo.connected && connectionInfo.hasStartedConnecting);

  if (!shouldShow) {
    return null;
  }

  return (
    <View className={classNames('flex items-center justify-center p-1', className)}>
      <View className="flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-90">
        <View
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getStatusColor() }}
        />
        <Text className="text-xs text-gray-700">
          {getStatusText()}
        </Text>
        {connectionInfo.backgroundKeepAlive && (
          <Text className="text-xs text-blue-600">
            📱
          </Text>
        )}
      </View>
    </View>
  );
};

export default ConnectionStatus;
