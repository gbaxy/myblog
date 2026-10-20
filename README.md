# GBの博客

一个程序农工

gbaxy 的工程笔记，记录 Linux 驱动、系统编程、Audioreach 与工程实践。

基于 [astro-koharu](https://github.com/cosZone/astro-koharu) 7.7.4（上游提交 `329ce55513a8057708c93c11c5b8c096680ad83c`），使用 Astro **7.1.3**、React **19.2.1**、Tailwind CSS **4.3.3**、Motion **12.43.0**。保留上游 AGPL-3.0 许可证和页脚署名。

## 本地运行

需要 Node **>=22.20.0**（已用 24.19.0 验证）和 pnpm **10.28.2**。当前系统 Node 22.18.0 需要升级；也可在 PowerShell 中使用已经准备的独立运行时：

```powershell
$env:PATH = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;E:\myblog\.references\runtime\node_modules\.bin;' + $env:PATH
pnpm install --frozen-lockfile
pnpm dev
```

本地地址为 `http://localhost:4321/myblog/`。

```sh
pnpm check
pnpm lint:fix
pnpm test
pnpm build
pnpm preview
```

## 内容与视觉

- `config/site.yaml`：站点资料、导航、分类、动效和功能开关。
- `src/content/blog/`：文章，使用 `date`、`updated`、`categories`、`tags`、`link`、`sticky`。
- `src/styles/byte-vein.css`：蓝色视觉、深色模式和阅读排版。
- `public/img/byte-vein/`：薇尔莉特同人主图、手机裁切和分类插画。主图为 AI 生成同人插画。
- `src/lib/base-path.ts`：部署前缀 `/myblog`。
- `src/pages/[...legacy].astro`：旧文章、分类、标签和归档地址的静态兼容跳转。

示例文章头信息：

```yaml
---
title: 文章标题
description: 文章简介
date: "2026-10-20"
link: stable-post-slug
categories: [Linux 驱动开发]
tags: [Linux, 驱动开发]
---
```

主题自带 SPA 转场、卡片动效、目录进度、移动目录、阅读设置、代码复制/全屏、图片查看、Mermaid 与 Pagefind 全文搜索。评论、统计、音乐、写作室和服务端动态功能目前关闭，静态托管不需要服务器。

## 部署与迁移记录

GitHub Actions 使用 `.node-version` 和 `pnpm-lock.yaml`，检查后构建并发布到 `https://gbaxy.github.io/myblog/`。推送到 `main` 或手动触发工作流才会发布。

2026-10-20 迁移保留原有 8 篇文章的正文、日期、分类与标签。旧 `/blog/<slug>/` 地址跳转至 `/post/<slug>`，并保留查询参数和锚点。原始正文校验值保存在 `migration-manifest.json`。

本地备份位于 `.references/backups/2026-10-20-before-koharu/`，上游参考位于 `.references/astro-koharu/`。`.references/` 不进入版本控制和发布产物。
