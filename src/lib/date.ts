export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function readingTime(body: string) {
  const characters = body.replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(characters / 450));
}
