import { defaultStack as browserDefaultStack } from "@hyperjump/browser";

/**
 * @import { Fetcher } from "@hyperjump/browser"
 */

/**
 * What a `JsonSchema` retrieves through when its config doesn't have a
 * `stack`. A browser caches responses itself, so it's browser's default.
 *
 * @type () => Fetcher
 */
export const defaultStack = () => browserDefaultStack();
