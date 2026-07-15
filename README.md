# 昨天本来可以

一个只显示昨天天气、顺便复盘人生的情绪价值网站。

> 天气已经发生，遗憾仍在更新。

## 已实现

- Open-Meteo 昨日与前日天气
- 中文城市搜索与城市切换
- 温柔、冷淡、讽刺三档语录
- 主天气卡压力倾斜与长按彩蛋
- 昨日复盘、本地持久化与规则判词
- 昨天/前天对比与双城市对比
- 9:16、1:1 高清分享图片导出
- 响应式移动端与减少动态效果支持

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端中显示的本地地址即可。

## 检查与构建

```bash
npm run lint
npm run build
npm run start
```

## 数据与隐私

- 天气与城市数据来自 Open-Meteo。
- 私人复盘保存在浏览器 localStorage，不会上传。
- 无需登录账号。
- 天气接口失败时页面会使用演示数据保持可用。

## 主要目录

```text
app/
├─ page.tsx                 页面与交互
├─ globals.css              主视觉样式
├─ extras.css               城市对比补充样式
└─ api/
   ├─ weather/route.ts      昨日天气服务端代理
   └─ geocoding/route.ts    城市搜索服务端代理
```

## 部署

项目使用 Vinext 与 Cloudflare 兼容构建。构建完成后会生成 `dist`，其中包含 Worker 入口与静态资源。
