# 字节矿脉 / Byte Vein

一个基于 Astro 的中文静态技术博客：Markdown 写作、深浅色主题、Mermaid 图表、Pagefind 本地搜索、RSS 与 Giscus 评论。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

在浏览器打开终端显示的本地地址。生产构建与预览：

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 Astro 静态构建，再执行 Pagefind，为文章生成不依赖第三方服务的全文搜索索引。

## 写文章

在 `src/content/blog/` 下新建一个 `.md` 文件；文件名就是文章 URL 的一部分。每篇文章都需要下面的 frontmatter：

```md
---
title: "文章标题"
description: "一句话摘要，用于列表和搜索结果。"
published: 2026-09-19
category: "工程实践"
tags: ["Astro", "GitHub Pages"]
draft: false
featured: false
---
```

流程、时序与架构图可以直接写 Mermaid：

````md
```mermaid
flowchart LR
  A[开始] --> B[构建]
  B --> C[发布]
```
````

文章页会自动渲染图表、生成目录并为普通代码块添加复制按钮。

## 发布前配置

编辑 `src/config.ts`：

1. 将 `author`、`links.github` 改成你的信息；
2. 将 `url` 改成实际 Pages 地址。
   - 用户/组织站仓库 `用户名.github.io`：`url` 为 `https://用户名.github.io`，`base` 保持 `/`；
   - 项目站仓库，例如 `myblog`：`url` 为 `https://用户名.github.io`，`base` 改为 `/myblog`。
3. 如果将来绑定自定义域名，`url` 改成 `https://你的域名`，`base` 保持 `/`。

## 启用 GitHub Pages

1. 将本项目提交并推送到 GitHub 仓库的 `main` 分支；
2. 在仓库打开 **Settings → Pages**；
3. 在 **Build and deployment** 的 Source 选择 **GitHub Actions**；
4. 推送后，Actions 中的 `Deploy Astro site to GitHub Pages` 工作流会自动运行；
5. 部署地址会显示在工作流的 Deploy 步骤中。

工作流文件在 `.github/workflows/deploy.yml`，以后每次推送 `main` 都会自动更新站点。

## 启用评论（Giscus）

Giscus 使用 GitHub Discussions 保存评论，访客可用 GitHub 账号参与，内容也归你的仓库所有。

1. 到仓库 **Settings → General → Features** 勾选 **Discussions**；
2. 在 [giscus.app/zh-CN](https://giscus.app/zh-CN) 授权并选择此仓库；
3. 选择 Discussion 分类（建议 `Announcements`）；
4. 将页面生成的 `data-repo`、`data-repo-id`、`data-category`、`data-category-id` 分别填入 `src/config.ts` 的 `giscus`；
5. 重新构建或推送，文章底部就会出现评论区。

没有填入这些值时，博客仍可正常构建，只会在评论区域显示一条本地配置提示。

## 文件结构

```text
src/content/blog/       Markdown 文章
src/pages/              页面与路由
src/layouts/            站点和文章布局
src/config.ts           站点、链接、Giscus 配置
src/styles/global.css   全局设计系统
.github/workflows/      GitHub Pages 自动部署
```
