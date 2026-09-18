import type { APIRoute } from "astro";
import { site as siteConfig } from "../config";

export const GET: APIRoute = ({ site }) => {
  const base = siteConfig.base === "/" ? "/" : `${siteConfig.base.replace(/\/$/, "")}/`;
  const sitemap = new URL(`${base}sitemap-index.xml`, site);
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap.href}\n`, {
    headers: { "Content-Type": "text/plain" },
  });
};
