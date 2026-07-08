# 爱在浙大 · Love in ZJU

浙大情侣恋爱集成 App —— uni-app (H5 + 微信小程序) + Express/PostgreSQL 全栈项目。

## 功能模块

| 模块 | 说明 |
|------|------|
| 登录/注册 | JWT 鉴权，情侣绑定（邀请码） |
| 倒计时 | 纪念日 / 自定义倒计时 |
| 每日任务 | 情侣共同任务，完成获得积分 |
| AI 算命 | Claude AI 占卜今日运势 |
| 匹配度测试 | 情侣共答题目，AI 分析匹配度 |
| AI 陪伴 | 可定制角色的 AI 伴侣聊天 |
| 养幼崽 | 情侣共养虚拟萌宠 |
| 纪念本 | 上传照片/文字，留存纪念 |
| 小屋 | 每日签到积分 + 购买装扮 |

## 目录结构

```
love-in-zju/
├── README.md                 # 本文件
├── WECHAT.md                 # 微信小程序上线专项指南
├── package.json              # 根级（含后端依赖 + 便捷脚本）
├── frontend/                 # uni-app 前端源码
│   ├── src/
│   │   ├── pages/            # 各页面 (.vue)
│   │   │   ├── login/        # 登录注册
│   │   │   ├── home/         # 首页（倒计时 + 今日任务）
│   │   │   ├── countdown/    # 倒计时管理
│   │   │   ├── fortune/      # AI 算命
│   │   │   ├── match/        # 匹配度测试
│   │   │   ├── companion/    # AI 陪伴
│   │   │   ├── pet/          # 养幼崽
│   │   │   ├── memories/     # 纪念本
│   │   │   ├── house/        # 小屋
│   │   │   └── mine/         # 我的（个人中心）
│   │   ├── components/
│   │   │   └── TabBar.vue    # 底部导航栏
│   │   ├── utils/
│   │   │   └── request.js    # 统一请求封装 + API 方法表
│   │   ├── static/
│   │   │   └── logo.png      # 应用 logo
│   │   ├── App.vue           # 根组件
│   │   ├── main.js           # 入口
│   │   ├── pages.json        # uni-app 路由配置
│   │   ├── manifest.json     # 应用配置（AppID 在这里填）
│   │   └── uni.scss          # 全局样式变量
│   ├── vite.config.js        # Vite + uni 插件配置
│   ├── index.html            # H5 入口模板
│   ├── package.json          # 前端依赖
│   └── shims-uni.d.ts        # TS 类型声明
└── server/                   # Express.js 后端源码
    ├── index.js              # 服务入口 + 所有路由
    ├── db.js                 # PostgreSQL 连接 + 建表
    ├── ai.js                 # Claude AI 调用封装
    ├── companions.js         # AI 陪伴角色配置
    ├── pets.js               # 宠物状态逻辑
    ├── quizzes.js            # 匹配度题库
    ├── house.js              # 小屋商店/主题配置
    ├── storage.js            # S3 图片上传
    ├── loadenv.js            # 环境变量加载
    ├── package.json          # 后端依赖
    └── .env.example          # 环境变量示例（见下方说明）
```

## 快速开始（本地开发）

### 1. 后端

```bash
cd server
cp .env.example .env          # 填写环境变量
npm install
node index.js                 # 默认监听 3000 端口
```

### 2. 前端（H5 开发模式）

```bash
cd frontend
npm install
npm run dev:h5                # 启动 H5 开发服务器
```

H5 模式下前端请求自动指向当前页面地址（相对路径），无需修改接口地址。

## 环境变量（server/.env）

```env
# 数据库（PostgreSQL）
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT 密钥（自己随机生成一串字符串）
JWT_SECRET=your-random-secret-here

# Claude AI（算命 / 匹配 / 陪伴功能）
ANTHROPIC_API_KEY=sk-ant-...
# 如使用代理/第三方接口：
# ANTHROPIC_BASE_URL=https://your-proxy.com
# ANTHROPIC_AUTH_TOKEN=your-token

# 图片存储（腾讯云 COS / 任意 S3 兼容）
S3_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-secret-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-guangzhou
S3_KEY_PREFIX=love-in-zju/
S3_PUBLIC_BASE_URL=https://your-bucket.cos.ap-guangzhou.myqcloud.com

# 服务端口（默认 3000）
PORT=3000
HOST=0.0.0.0
```

## 部署方案

### 方案 A：全栈部署（后端 + 静态托管前端）

后端会自动托管 `frontend/dist/build/h5/` 作为静态文件。

```bash
# 1. 先 build 前端
cd frontend && npm install && npm run build:h5 && cd ..

# 2. 部署到 Render / Railway / 自己的 VPS（需要 PostgreSQL）
# 启动命令：node server/index.js
# 需要设置所有环境变量（DATABASE_URL 等）
```

### 方案 B：zaodeploy 一键部署（平台内）

```bash
cd love-in-zju
zaodeploy deploy --project love-in-zju --start "node server/index.js" --db postgres
```

### 方案 C：前端静态 + 独立后端

- 前端 build 产物 `frontend/dist/build/h5/` 托管到 Vercel / Netlify / GitHub Pages
- 后端独立部署，修改 `frontend/src/utils/request.js` 中的接口地址

## GitHub 上线流程

1. 在 GitHub 新建仓库（如 `love-in-zju`），不勾选初始化文件
2. 在本地 `love-in-zju/` 目录执行：

```bash
git init
git add .
git commit -m "init: 爱在浙大全栈项目"
git remote add origin https://github.com/<你的用户名>/love-in-zju.git
git push -u origin main
```

3. 根据目标平台配置 CI/CD：
   - **Render**：连接 GitHub 仓库，Build Command: `cd frontend && npm install && npm run build:h5`，Start Command: `node server/index.js`
   - **Railway**：同上，平台自动检测 `package.json`
   - **VPS**：`git clone` 后手动执行上述命令

## 微信小程序上线

详见 [WECHAT.md](./WECHAT.md)，步骤概要：

1. 注册小程序账号，拿到 AppID → 填入 `frontend/src/manifest.json`
2. 把已部署后端的 https 域名 → 填入 `frontend/src/utils/request.js`（`#ifndef H5` 分支）
3. `npm run build:mp-weixin` → 微信开发者工具上传 → 提交审核

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | uni-app 3 + Vue 3 (Composition API) |
| 前端构建 | Vite 5 + @dcloudio/vite-plugin-uni |
| 后端框架 | Express 4 (ESM) |
| 数据库 | PostgreSQL (pg 驱动) |
| 鉴权 | JWT (jsonwebtoken + bcryptjs) |
| AI | Claude API (Anthropic) |
| 图片存储 | S3 兼容对象存储 (@aws-sdk/client-s3) |
| 文件上传 | multer |
