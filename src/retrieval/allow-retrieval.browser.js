/**
 * Browsers can't read files, so there are no symlinks to follow
 *
 * @type (url: URL) => Promise<URL>
 */
export const realUrl = async (url) => url;

/**
 * What a relative `allowRetrieval` entry resolves against: the page, like
 * browser's context URI. A worker has no page.
 *
 * @type () => string | undefined
 */
export const contextUri = () => {
  const { document } = /** @type {{ document?: { location?: { href: string } } }} */ (globalThis);
  return document?.location?.href;
};
