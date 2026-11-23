/**
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 */

/**
 * A session's `defaultDialects`, parsed. Its keys follow browser's rule for
 * `headers` and `allowRetrieval` (`src/url-entries.js` there): a key that
 * ends with `/` and has no query is for every URL under it, and any other
 * key only for itself. Keys are compared parsed, without fragments. Exact
 * keys are a `Map`, so a long list of files costs nothing, and prefixes
 * are longest first, so the longest that matches wins.
 *
 * @typedef {{
 *   exact: Map<string, string>;
 *   prefixes: [string, string][];
 * }} DefaultDialects
 */

/** The key of a session's parsed `defaultDialects` in its state */
const defaultDialectsKey = {};

/**
 * The dialect `defaultDialects` gives a document at a URL, if any. Relative
 * keys are resolved against the session's context URL, the first time
 * they're needed.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, url: string) => string | undefined
 * @throws {TypeError} If a key isn't a URL, or is relative and the session
 * has no context URL.
 */
export const defaultDialectFor = (session, url) => {
  const { exact, prefixes } = session.state(defaultDialectsKey, () => parseDefaultDialects(session.config.defaultDialects ?? {}, session.contextUrl));
  const target = withoutFragment(url);
  return exact.get(target) ?? prefixes.find(([prefix]) => target.startsWith(prefix))?.[1];
};

/** @type (entries: Record<string, string>, base: string | undefined) => DefaultDialects */
const parseDefaultDialects = (entries, base) => {
  const exact = new Map();
  /** @type [string, string][] */
  const prefixes = [];
  for (const [key, dialectUri] of Object.entries(entries)) {
    if (!URL.canParse(key, base)) {
      throw TypeError(base === undefined
        ? `'${key}' in 'defaultDialects' isn't an absolute URL, and there's no base URL to resolve it against`
        : `'${key}' in 'defaultDialects' isn't a URL`);
    }
    const url = withoutFragment(new URL(key, base).href);
    if (url.endsWith("/") && !url.includes("?")) {
      prefixes.push([url, dialectUri]);
    } else {
      exact.set(url, dialectUri);
    }
  }
  prefixes.sort(([a], [b]) => b.length - a.length);
  return { exact, prefixes };
};

/** @type (url: string) => string */
const withoutFragment = (url) => {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href;
};
