# 字节矿脉迁移记录

2026-10-20，从 Astro 5.18.2 自定义博客迁移至 Koharu 7.7.4。上游固定提交：`329ce55513a8057708c93c11c5b8c096680ad83c`。

## 最终版本与内容

| 项目 | 迁移后 |
| --- | --- |
| Astro | 7.1.3 |
| React | 19.2.1 |
| Tailwind CSS | 4.3.3 |
| Motion | 12.43.0 |
| pnpm | 10.28.2 |
| 验证使用的 Node | 24.19.0，最低要求 22.20.0 |
| 部署地址 | https://gbaxy.github.io/myblog/ |
| 分支 | codex/koharu-migration |

8 篇原文章的正文 SHA-256 均与迁移前一致。标题、简介、日期、更新时间、分类、标签、置顶及草稿标记逐项核对一致。`published/category/featured` 转换为 `date/categories/sticky`，`link` 固定为原文件 slug。

保留原有 7 个分类，包括暂时没有文章的「C/C++ 语言与工程」。旧 `/blog/`、`/category/`、`/tag/`、`/archive/` 地址生成静态兼容跳转；文章跳转保留查询参数和锚点。

蓝色视觉覆盖保留 Koharu 原生组件和 SPA 动效。薇尔莉特主图提供桌面和手机裁切，构建时输出 AVIF/WebP。保留主题许可证和署名，移除原作者的示例文章、头像、歌单、统计配置和个人介绍。

## 验证结果

- 生产构建、Astro 类型检查、Biome `lint:fix` 均通过。类型检查保留 3 个提示，Biome 保留 10 条上游建议性信息。
- Node 测试共 354 项：351 项通过、0 项失败、3 项在 Windows 上明确跳过。跳过项依赖 POSIX 文件权限、文件符号链接权限或 POSIX 符号链接归档。
- 修复 Windows 下 tar 输出 CRLF 解析、迁移路径展示和 pnpm 测试启动方式；目录链接边界测试使用 Windows junction，仍验证不会覆盖外部目标。
- 105 个生成 HTML 中的 97 个站内链接和资源 URL 均在 `/myblog/` 内且存在目标文件。
- Chrome 实测：SPA 无整页刷新；阅读字号、行距和深色模式跨页面保留；目录跳转、搜索结果、旧链接、减弱动态偏好正常；390/768/1440 像素宽度无横向溢出。
- Linux 设备模型 3 张图和 AudioReach 23 张图全部按需渲染为 SVG；控制台无未捕获错误，资源请求无失败。
- 开发服务器首页与 `/myblog/pagefind/pagefind-component-ui.js` 返回 200。
- `knip` 已执行，仍会因上游可选功能、导出和工具文件的未使用报告退出非零。迁移版为 80 个文件、10 个依赖、181 个导出；只读上游对照为 82、12、182。未为消除报告而删除主题功能。

浏览器截图与详细日志保存在本地 `.references/previews-migration/` 和 `.references/migration-*.log`，不进入发布产物。

## 本地备份

`.references/backups/2026-10-20-before-koharu/` 保存迁移开始时的全部源文件及未提交修改。其 `root-before-switch/` 保存切换前完整项目目录；`node_modules/` 保存旧依赖。Git 历史保留。

独立 Node/pnpm 启动方式见根目录 README。当前系统 Node 22.18.0 低于主题最低要求，迁移没有更改系统级 Node 安装。

本地迁移与发布分两步进行。经用户确认发布后，提交并推送到 `main`，由 GitHub Pages 工作流部署；线上状态以对应提交的 Actions 结果为准。
