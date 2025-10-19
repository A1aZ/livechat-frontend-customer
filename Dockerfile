# 多阶段构建：第一阶段用于构建项目
FROM image-artifact-registry-vpc.cn-hangzhou.cr.aliyuncs.com/library/node:22-slim AS builder

# 设置构建环境变量
ARG BUILD_MODE
ARG NODE_ENV
ENV BUILD_MODE=${BUILD_MODE}
ENV NODE_ENV=${NODE_ENV}

# 设置时区
ENV TZ=Asia/Shanghai

# 设置镜像源加速
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 安装构建依赖（用于编译原生模块）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 和 yarn.lock
COPY package*.json yarn.lock ./

# 配置阿里云镜像站加速依赖安装
RUN yarn config set registry https://registry.npmmirror.com && \
    yarn config set network-timeout 100000 && \
    yarn config list

# 清理缓存并重新安装依赖
RUN yarn cache clean && \
    yarn install --frozen-lockfile

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

# 复制自定义 nginx 站点配置
COPY customer.conf /etc/nginx/conf.d/customer.conf

# 从构建阶段复制构建产物到 nginx 服务目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
