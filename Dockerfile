# 多阶段构建：第一阶段用于构建项目
FROM image-artifact-registry-vpc.cn-hangzhou.cr.aliyuncs.com/library/node:22-alpine AS builder

# 设置时区
ENV TZ=Asia/Shanghai

# 设置镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置工作目录
WORKDIR /app

# 安装构建依赖（用于编译原生模块）
RUN apk add --no-cache python3 make g++

# 设置构建环境变量（匹配 GitHub Actions 工作流）
ENV BUILD_MODE=${BUILD_MODE}
ENV NODE_ENV=${NODE_ENV}

# 复制 package.json 和 yarn.lock
COPY package*.json yarn.lock ./

# 配置阿里云镜像站加速依赖安装
RUN yarn config set registry https://registry.npmmirror.com && \
    yarn config set network-timeout 100000 && \
    yarn config set network-concurrency 8 && \
    yarn config set cache-folder /tmp/.yarn-cache && \
    yarn config set prefer-offline false && \
    yarn config list

# 清理缓存并重新安装依赖（如果失败则重试）
RUN yarn cache clean && \
    (yarn install --frozen-lockfile --network-timeout 100000 || \
     (echo "首次安装失败，重试中..." && sleep 5 && yarn install --frozen-lockfile --network-timeout 600000) || \
     (echo "重试失败，使用 npm 安装..." && npm config set registry https://registry.npmmirror.com && npm install --no-package-lock))

# 复制源代码
COPY . .

# 构建项目（匹配 GitHub Actions 工作流中的构建命令）
RUN yarn build:h5 --mode ${BUILD_MODE}

# 验证构建产物（匹配 GitHub Actions 工作流中的验证步骤）
RUN echo "🔍 验证构建产物..." && \
    if [ -f "dist/index.html" ]; then \
        echo "✅ index.html 存在"; \
    else \
        echo "❌ index.html 不存在" && exit 1; \
    fi && \
    if [ -d "dist/js" ] && [ "$(ls -A dist/js/*.js 2>/dev/null | wc -l)" -gt 0 ]; then \
        echo "✅ JS文件存在" && \
        echo "📊 JS文件数量: $(ls -A dist/js/*.js 2>/dev/null | wc -l)"; \
    else \
        echo "❌ JS文件不存在" && exit 1; \
    fi && \
    if [ -d "dist/css" ] && [ "$(ls -A dist/css/*.css 2>/dev/null | wc -l)" -gt 0 ]; then \
        echo "✅ CSS文件存在" && \
        echo "📊 CSS文件数量: $(ls -A dist/css/*.css 2>/dev/null | wc -l)"; \
    else \
        echo "❌ CSS文件不存在" && exit 1; \
    fi && \
    echo "📏 构建产物大小统计:" && \
    du -sh dist/* && \
    echo "✅ 构建验证通过"

# 第二阶段：使用 nginx 服务静态文件
FROM image-artifact-registry-vpc.cn-hangzhou.cr.aliyuncs.com/library/nginx:stable

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物到 nginx 服务目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
