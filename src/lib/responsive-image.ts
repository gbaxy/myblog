import type { ImageMetadata } from 'astro';
import { withBase, withoutBase } from './base-path';

const images = import.meta.glob<{ default: ImageMetadata }>('/public/img/**/*.{avif,jpg,jpeg,png,webp}');

export const responsiveImageQuality = 50;
export const defaultHeroImage = '/img/byte-vein/violet-garden.webp';
// On tall phones every cover shows the same central portrait crop, so the banner can persist across pages.
export const portraitHeroMedia = '(max-width: 600px)';
export const wideHeroMedia = `not all and ${portraitHeroMedia}`;
export const portraitHeroTransform = {
  width: 400,
  height: 450,
  densities: [1, 2, 3],
  fit: 'cover' as const,
  position: 'right',
};
export const defaultHeroSrcset = `${withBase('/img/byte-vein/violet-garden-1280.webp')} 1280w, ${withBase(defaultHeroImage)} 1672w`;

export async function resolveResponsiveImage(src: string, maxWidth = 1600) {
  const image = await images[`/public${withoutBase(src)}`]?.();
  if (!image) return undefined;
  const width = Math.min(maxWidth, image.default.width);
  const widths = [...new Set([400, 800, 1200, width].filter((candidate) => candidate <= width))];
  return { src: image.default, width, widths };
}
