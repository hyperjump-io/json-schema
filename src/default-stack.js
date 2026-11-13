import { compose, defaultStack as browserDefaultStack, httpCache } from "@hyperjump/browser";

/**
 * @import { Fetcher } from "@hyperjump/browser"
 */

/**
 * What a `JsonSchema` retrieves through when its config doesn't have a
 * `stack`. Every session of a `JsonSchema` shares it, and an operation
 * starts a session for each call, so it has an HTTP cache, which is what
 * keeps a call from retrieving what an earlier one did. The cache is on top,
 * so a response it has doesn't wait for a connection.
 *
 * @type () => Fetcher
 */
export const defaultStack = () => compose(httpCache())(browserDefaultStack());
