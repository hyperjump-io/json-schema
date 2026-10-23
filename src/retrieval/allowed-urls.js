import { contextUri, realUrl } from "#retrieval";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * Resolve `allowRetrieval` entries against the context URI. One that isn't a
 * URL, or is relative where there's no context URI, such as in a worker,
 * throws.
 *
 * @type (allowRetrieval: unknown) => string[]
 */
export const resolveAllowRetrieval = (allowRetrieval) => {
  if (!Array.isArray(allowRetrieval) || allowRetrieval.some((entry) => typeof entry !== "string")) {
    throw TypeError("The 'allowRetrieval' config must be a list of URLs");
  }

  return allowRetrieval.map((/** @type string */ entry) => {
    let url;
    try {
      url = new URL(entry);
    } catch {
      const base = contextUri();
      if (base === undefined) {
        throw Error(`'${entry}' in the 'allowRetrieval' config is relative, and there's nothing to resolve it against here. Use an absolute URL.`);
      }

      try {
        url = new URL(entry, base);
      } catch {
        throw Error(`'${entry}' in the 'allowRetrieval' config isn't a URL`);
      }
    }

    url.hash = "";
    return url.href;
  });
};

/**
 * Each `JsonSchema`'s resolved `allowRetrieval` config. It isn't there if
 * it's the default.
 *
 * @type WeakMap<JsonSchema, string[]>
 */
const configured = new WeakMap();

/** @type (jsonSchema: JsonSchema, allowRetrieval: unknown) => void */
export const configureAllowRetrieval = (jsonSchema, allowRetrieval) => {
  configured.set(jsonSchema, resolveAllowRetrieval(allowRetrieval));
};

/** @type (jsonSchema: JsonSchema) => string[] | undefined */
export const configuredAllowRetrieval = (jsonSchema) => configured.get(jsonSchema);

/**
 * The default is resolved when it's first checked, not when it's
 * configured, so an application without a context URI that only uses
 * registries doesn't need the config.
 */
const defaultAllowRetrieval = ["./"];

/**
 * What a session can retrieve. A `file:` entry is compared by its real path,
 * like the URL being checked. It's found the first time it's checked and
 * kept for the session.
 */
export class AllowedUrls {
  /** @type string[] | undefined */
  #entries;

  /** @type Promise<string[]> | undefined */
  #realEntries;

  /**
   * @param {string[]} [entries] - Resolved entries. Without them, it's the default.
   */
  constructor(entries) {
    this.#entries = entries;
  }

  /** @type (url: URL) => Promise<boolean> */
  async allows(url) {
    this.#realEntries ??= Promise.all((this.#entries ?? resolveAllowRetrieval(defaultAllowRetrieval)).map(realEntry));
    const entries = await this.#realEntries;
    return entries.some((entry) => entry.endsWith("/") ? url.href.startsWith(entry) : url.href === entry);
  }
}

/**
 * A real path doesn't end with `/`, so a directory's entry gets it back
 *
 * @type (entry: string) => Promise<string>
 */
const realEntry = async (entry) => {
  const { href } = await realUrl(new URL(entry));
  return entry.endsWith("/") && !href.endsWith("/") ? `${href}/` : href;
};
