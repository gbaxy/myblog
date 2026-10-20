import { siteConfig } from '@lib/config/site';
import { withBase } from '../base-path';

/**
 * Get the OG image URL with proper fallback chain
 * Priority: cover → defaultOgImage → avatar
 *
 * @param cover - Optional post cover image path
 * @param site - Site URL for absolute URL generation
 * @returns Absolute URL string or undefined
 */
export function getOgImageUrl(cover: string | undefined, site: URL | undefined): string | undefined {
  // Social crawlers do not consistently support the vector category covers.
  const imagePath = (cover?.endsWith('.svg') ? undefined : cover) || siteConfig.defaultOgImage || siteConfig.avatar;
  return imagePath && site ? new URL(withBase(imagePath), site).href : undefined;
}
