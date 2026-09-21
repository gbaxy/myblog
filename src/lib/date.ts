export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function readingTime(body = "") {
  let codeLines = 0;
  const text = body
    .replace(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\s*$/gm, (_match, _fence, code: string) => {
      codeLines += code.split("\n").filter((line) => line.trim()).length;
      return " ";
    })
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ");
  const chineseCharacters = (text.match(/\p{Script=Han}/gu) ?? []).length;
  const words = (text.match(/[\p{Script=Latin}\d]+(?:['’-][\p{Script=Latin}\d]+)*/gu) ?? []).length;
  return Math.max(1, Math.ceil(chineseCharacters / 450 + words / 220 + codeLines / 30));
}
