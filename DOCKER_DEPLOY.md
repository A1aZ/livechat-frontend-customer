# Docker 部署说明

本项目支持通过 Docker 进行部署，可以根据环境变量选择不同的构建环境。

## 支持的环境

- `dev`: 开发环境
- `test`: 测试环境
- `prod`: 生产环境（默认）

## 构建镜像

### 生产环境（默认）
```bash
docker build -t livechat-frontend-customer .
```

### 指定环境构建
```bash
# 开发环境
docker build --build-arg BUILD_ENV=dev -t livechat-frontend-customer:dev .

# 测试环境
docker build --build-arg BUILD_ENV=test -t livechat-frontend-customer:test .

# 生产环境
docker build --build-arg BUILD_ENV=prod -t livechat-frontend-customer:prod .
```

## 运行容器

### 基本运行
```bash
docker run -d -p 8080:80 --name livechat-customer livechat-frontend-customer
```

### 使用自定义端口
```bash
docker run -d -p 3000:80 --name livechat-customer livechat-frontend-customer
```

## Dokploy 部署

在 Dokploy 中创建新服务时：

1. **Source**: 选择 Git 仓库
2. **Build Settings**:
   - Build Command: `docker build -t livechat-frontend-customer .`
   - Dockerfile Path: `./Dockerfile`
3. **Environment Variables**:
   - `BUILD_ENV`: 设置为 `prod`（生产）、`test`（测试）或 `dev`（开发）
4. **Port**: 80
5. **Domains**: 配置你的域名

### Dokploy 环境变量配置示例

在 Dokploy 服务配置中添加环境变量：
- Key: `BUILD_ENV`
- Value: `prod` （根据需要选择 dev/test/prod）

## 环境配置说明

不同环境会使用不同的 API 地址和 WebSocket 地址：

- **开发环境 (dev)**: 使用本地开发服务器
  - API: `/api/user`
  - WebSocket: `ws://localhost:8080/api/user/chat/ws`

- **测试环境 (test)**: 使用测试服务器
  - API: `https://test-chat.zmyyc.com/api/user`
  - WebSocket: `wss://test-chat.zmyyc.com/api/user/chat/ws`
  - Public Path: `/customer/`

- **生产环境 (prod)**: 使用生产服务器
  - API: `https://chat-t.zmyyc.com/api/user`
  - WebSocket: `wss://chat-t.zmyyc.com/api/user/chat/ws`
  - Public Path: `/customer/`

## 健康检查

容器提供了健康检查端点：
```
GET /health
```

返回 `200` 状态码和 "healthy" 响应表示服务正常。

## 注意事项

1. 确保你的服务器有足够的内存进行构建（推荐至少 2GB）
2. 如果需要修改 nginx 配置，可以编辑 `nginx.conf` 文件
3. 应用部署在 `/customer/` 路径下，请确保反向代理正确配置
4. 如果需要 API 代理，请在 `nginx.conf` 中取消注释相关配置并修改目标地址
5. Docker 构建过程中会自动重新编译原生依赖以匹配容器平台，确保构建成功
