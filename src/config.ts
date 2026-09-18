export const site = {
  title: "字节矿脉",
  englishTitle: "Byte Vein",
  description: "一个努力挖矿的工程师。",
  /**
   * 发布前改为你的 GitHub Pages 地址。
   * 个人站仓库：https://用户名.github.io
   * 项目站仓库： https://用户名.github.io/仓库名 （同时将 base 改为 /仓库名）
   */
  url: "https://gbaxy.github.io",
  base: "/myblog",
  author: "gbaxy",
  email: "",
  links: {
    github: "https://github.com/gbaxy",
  },
  giscus: {
    repo: "",
    repoId: "",
    category: "Announcements",
    categoryId: "",
  },
} as const;

export const navigation = [
  { label: "文章", href: "/archive/" },
  { label: "分类", href: "/categories/" },
  { label: "项目", href: "/projects/" },
  { label: "现在", href: "/now/" },
  { label: "关于", href: "/about/" },
] as const;
