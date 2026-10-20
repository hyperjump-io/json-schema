/**
 * Browsers can't read files, so there are no symlinks to follow
 *
 * @type (url: URL) => Promise<URL>
 */
export const realUrl = async (url) => url;

/**
 * In a browser, only `http(s):` URLs with the page's origin are allowed
 *
 * @type (url: URL) => boolean
 */
export const defaultAllowRetrieval = (url) => {
  const { location } = /** @type {{ location?: { origin: string } }} */ (globalThis);
  return (url.protocol === "http:" || url.protocol === "https:") && url.origin === location?.origin;
};
