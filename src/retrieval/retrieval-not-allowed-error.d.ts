import type { JsonSchemaConfig } from "../json-schema.d.ts";

/**
 * The `allowRetrieval` config refused a URL (see {@link JsonSchemaConfig}).
 * It's distinct from a `RetrievalError` from `@hyperjump/browser`, which is
 * for a URL that was allowed and couldn't be retrieved. Tools use the
 * difference: a refused URL is unknown, and one that failed is missing.
 */
export class RetrievalNotAllowedError extends Error {
  /** The URL that was refused. For a redirect, it's where it led. */
  uri: string;

  constructor(uri: string, message?: string);
}
