# 「爱在浙大」微信小程序上线指南

uni-app 一套代码已能编译出微信小程序。产物在 `frontend/dist/build/mp-weixin/`。
但小程序**不能**直接用网页预览那套地址，必须先有一个 **https 的后端域名**。下面按顺序做即可。

## 当前项目状态

我已经把小程序构建准备好：

- 普通调试包：`cd frontend && npm run build:mp-weixin`
- 正式上线前检查 + 打包：`cd frontend && npm run build:mp-weixin:prod`
- 小程序接口地址改成从 `VITE_API_BASE_URL` 读取，示例见 `frontend/.env.example`

现在还不能直接提交审核，差两个外部信息：

- 微信小程序 AppID：填到 `frontend/src/manifest.json` 的 `mp-weixin.appid`
- 已备案、证书正常的 HTTPS 后端域名：填到 `frontend/.env.production` 的 `VITE_API_BASE_URL`

当前临时后端 `http://3250105888-love-in-zju.apps.zaowuyun.com/api/` 可以在开发者工具里勾选“不校验合法域名”后联调。调试时可临时执行：

```bash
cd frontend
VITE_API_BASE_URL=http://3250105888-love-in-zju.apps.zaowuyun.com/api/ npm run build:mp-weixin
```

但它不是正式小程序可用地址；它的 HTTPS 证书和域名不匹配，不能拿去提交审核。

---

## 前置：小程序对后端的硬性要求

微信小程序的网络请求（`uni.request`）有两条硬性规定：
1. 只能请求 **https** 域名（本地开发时可在开发者工具里勾"不校验合法域名"临时绕过）。
2. 域名必须在小程序后台的 **request 合法域名** 白名单里，且该域名需**已备案**。

所以流程是：**先把后端部署成 https → 拿到域名 → 填进小程序 → 编译上传**。

---

## 步骤 1：部署后端，拿到 https 域名

后端在 `server/` 目录，需要一个能跑 Node + PostgreSQL 的地方，对外提供 https。两种选择：

- **A. 用本平台部署（最省事）**：让我执行 `zaodeploy deploy --project love-in-zju --start "node index.js" --db postgres`（在 `server` 目录，且需先把前端 `dist` 一起带上或调整托管方式），会得到一个平台域名。
- **B. 自己的服务器 / 云**：把 `server/` 跑起来（`npm install && node index.js`），配好 PostgreSQL（设 `DATABASE_URL` 环境变量）和 https（Nginx + 证书）。AI 功能需设 `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`（或你自己的 `ANTHROPIC_API_KEY`）。

假设最终后端地址是 `https://your-domain.com`，接口前缀就是 `https://your-domain.com/api/`。

## 步骤 2：把后端地址填进前端

复制示例环境变量文件：

```bash
cd frontend
cp .env.example .env.production
```

把 `.env.production` 改成你的真实地址，例如：

```env
VITE_API_BASE_URL=https://your-domain.com/api/
```

（H5 分支不用动，网页版会自动按当前地址推导。）

## 步骤 3：填小程序 AppID

1. 到 [微信公众平台](https://mp.weixin.qq.com) 注册一个**小程序**账号，拿到 **AppID**。
2. 编辑 `frontend/src/manifest.json`，把 `mp-weixin.appid` 填上：

```json
"mp-weixin" : {
    "appid" : "你的AppID",
    "setting" : { "urlCheck" : false },
    "usingComponents" : true
}
```

## 步骤 4：重新编译小程序

在 `frontend/` 目录执行：

```bash
npm install        # 若还没装依赖
npm run build:mp-weixin:prod
```

产物输出到 `frontend/dist/build/mp-weixin/`。

## 步骤 5：用微信开发者工具打开并预览

1. 下载安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 打开 → 导入项目 → 目录选择 `frontend/dist/build/mp-weixin/` → 填入同一个 AppID。
3. 首次联调：右上角"详情 → 本地设置"里勾上 **"不校验合法域名、web-view..."**，这样能先连你的后端调试。

## 步骤 6：配置合法域名（正式发布必须）

到 [微信公众平台](https://mp.weixin.qq.com) → 开发管理 → 开发设置 → **服务器域名** → 在 **request 合法域名** 里加上你的后端域名（如 `https://your-domain.com`）。该域名需已备案。

## 步骤 7：上传与提交审核

1. 在微信开发者工具里点 **上传**，填版本号和备注。
2. 回到微信公众平台 → 版本管理 → 把刚上传的版本 **提交审核**。
3. 审核通过后点 **发布**，小程序即上线。

---

## 常见问题

- **真机上请求失败 / 白屏**：多半是后端不是 https、或域名没进 request 合法域名白名单、或域名未备案。
- **AI 算命/匹配报错**：后端所在环境没配 `ANTHROPIC_*`，AI 接口会返回"暂时不在状态"。给后端配好 key 即可。
- **想同时上网页版**：`npm run build:h5` 出的是网页版，两者共用同一套后端，互不影响。

有需要我可以帮你把后端一键部署好，拿到域名后我直接把 `request.js` 和 `manifest.json` 改好、重新编译，你只管在开发者工具里上传。
