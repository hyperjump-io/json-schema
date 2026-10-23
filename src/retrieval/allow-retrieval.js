import { realpath } from "node:fs/promises";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * The URL `allowRetrieval` checks. A `file:` URL is replaced with its real
 * path, so a symlink in an allowed directory can't lead outside it. A file
 * that doesn't exist has no real path, so its path is checked as it is.
 *
 * @type (url: URL) => Promise<URL>
 */
export const realUrl = async (url) => {
  if (url.protocol !== "file:") {
    return url;
  }

  try {
    return pathToFileURL(await realpath(fileURLToPath(url)));
  } catch (error) {
    const code = /** @type {{ code?: unknown }} */ (error).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return url;
    }
    throw error;
  }
};

/**
 * What a relative `allowRetrieval` entry resolves against: the working
 * directory, like browser's context URI
 *
 * @type () => string | undefined
 */
export const contextUri = () => {
  const url = pathToFileURL(cwd());
  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  return url.href;
};
