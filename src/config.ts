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

/**
 * 在这里登记需要提前展示的文章大类；即使暂时没有文章，分类页也会保留入口。
 */
export const categoryCatalog = [
  {
    name: "Audioreach",
    description: "Audioreach 相关的技术记录、问题排查与工程实践。",
  },
  {
    name: "Linux 驱动开发",
    description: "Linux 设备模型、驱动框架、硬件接口与嵌入式实践。",
  },
  {
    name: "操作系统与系统编程",
    description: "内核机制、Unix/Linux 系统调用与用户态系统编程。",
  },
  {
    name: "C/C++ 语言与工程",
    slug: "c-cpp",
    description: "C/C++ 语言特性、内存模型、性能与工程实践。",
  },
] as const;

export const navigation = [
  { label: "文章", href: "/archive/" },
  { label: "分类", href: "/categories/" },
  { label: "项目", href: "/projects/" },
  { label: "现在", href: "/now/" },
  { label: "关于", href: "/about/" },
] as const;
