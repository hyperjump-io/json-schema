import { realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
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
 * In Node.js, only files in the working directory are allowed. It's the
 * working directory's real path, because the URL being checked is a real
 * path too.
 *
 * @type (url: URL) => Promise<boolean>
 */
export const defaultAllowRetrieval = async (url) => {
  if (url.protocol !== "file:") {
    return false;
  }

  const path = relative(await realpath(cwd()), fileURLToPath(url));
  return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
};
