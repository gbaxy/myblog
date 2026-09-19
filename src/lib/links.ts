import { categoryCatalog, site } from "../config";

export function href(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = site.base === "/" ? "" : site.base.replace(/\/$/, "");
  return `${base}${normalized}`;
}

export function categoryHref(category: string) {
  const slug = categoryCatalog.find((item) => item.name === category)?.slug ?? category;
  return href(`/category/${slug}/`);
}
