# Livechat 客户侧前端

基于 Taro,TypeScript,React 实现  
需要与下面 Repo 配合适用
- [客服工作台前端代码](https://github.com/gr-cloud-storage/livechat-frontend-desk)
- [后端代码](https://github.com/gr-cloud-storage/livechat-backend)

### 开始

- 环境要求：Node.js = 18
- 安装依赖：使用 `yarn install` 命令
- 开发调试：`yarn dev:h5`

详见[Taro](https://github.com/NervJS/taro)


### 功能特性

#### 自动发送页面信息

客户侧页面支持根据URL的query参数自动发送当前页面信息给客服，方便客服了解用户访问的上下文。

**使用方法：**

在URL中添加 `auto_send=1` 或 `auto_send=true` 参数：

```
https://yourdomain.com/chat?auto_send=1
```

您还可以在URL中添加自定义参数，这些参数也会被发送给客服：

```
https://yourdomain.com/chat?auto_send=1&product_id=123&user_action=click&source=homepage
```

**功能说明：**

- 当用户通过包含 `auto_send` 参数的URL访问客服页面时，系统会自动发送一条消息给客服
- 消息内容包含页面的标题、完整URL以及所有自定义参数（除 `auto_send` 外）
- 支持H5和小程序环境
- 每个页面只会发送一次，避免重复发送
- 自动发送的消息只对客服可见，客户自己不会在聊天界面看到这条消息

**消息格式示例：**
```
页面信息
标题：产品介绍页
链接：https://yourdomain.com/products?id=123
参数：
product_id=123
user_action=click
source=homepage
```

**在其他页面中嵌入：**

```html
<!-- HTML链接 -->
<a href="https://yourdomain.com/chat?auto_send=1">联系客服</a>

<!-- JavaScript跳转 -->
<button onclick="window.location.href='https://yourdomain.com/chat?auto_send=1'">
  联系客服
</button>
```

#### 其他功能

- **实时聊天**：支持文本、图片、语音、视频等多种消息类型
- **智能状态显示**：实时显示当前接待状态（AI接待中/转接人工中/人工接待中）
- **智能转人工按钮**：根据当前状态智能控制按钮可用性
- **转人工客服**：可以主动转接人工客服
- **清除聊天记录**：支持软删除所有聊天记录
- **排队等待**：显示当前等待人数


### 更新记录
2025.1.5 添加智能状态显示功能，实时显示AI接待中/转接人工中/人工接待中状态，并优化转人工按钮控制
2025.1.5 添加自动发送页面信息功能，支持根据URL参数自动发送页面URL和标题给客服
2025.1.5 update taro to 4.0.7
