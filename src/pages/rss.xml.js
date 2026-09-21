import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../config";
import { href } from "../lib/links";

export async function GET(context) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft))
    .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());

  return rss({
    title: site.title,
    description: site.description,
    site: new URL(href("/"), context.site).href,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: new URL(href(`/blog/${post.id}/`), context.site).href,
      categories: [post.data.category, ...post.data.tags],
    })),
  });
}
