import { site } from "../config";

export function href(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = site.base === "/" ? "" : site.base.replace(/\/$/, "");
  return `${base}${normalized}`;
}
