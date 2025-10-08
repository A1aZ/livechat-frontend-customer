# 多阶段构建：第一阶段用于构建项目
FROM image-artifact-registry-vpc.cn-hangzhou.cr.aliyuncs.com/library/node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置构建环境变量，支持 dev/test/prod，默认为生产环境
ARG BUILD_ENV=prod
ENV NODE_ENV=$BUILD_ENV

# 复制 package.json 和 yarn.lock
COPY package*.json yarn.lock ./

# 安装依赖
RUN yarn install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN npm run build:h5

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
