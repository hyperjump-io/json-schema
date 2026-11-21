import { InvalidIriError, assertIri, assertIriReference, hasScheme, normalizeIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";

/**
 * @import { Node, Point, Position } from "unist"
 * @import { AbsoluteIri, NormalizedIri } from "@hyperjump/uri"
 */

/**
 * An identifier as it's kept: absolute and normalized, so equivalent
 * identifiers are the same key. Resources, dialects, vocabularies, and
 * registry entries are kept by one.
 *
 * @typedef {AbsoluteIri & NormalizedIri} Id
 */

/**
 * The URL json-schema gives JSON that isn't from anywhere, like an instance,
 * or schema text before it's resolved, because browser's documents have to
 * have one. Nothing reads it: a schema's nodes get their locations from
 * their resources when it's resolved, and an instance's locations are worked
 * out as it's evaluated.
 */
export const noUrl = "urn:hyperjump:none";

/**
 * The {@link Id} of an identifier from outside json-schema, like an
 * application's or a config's. It's checked here, where it comes in.
 *
 * @type (uri: string) => Id
 * @throws {import("@hyperjump/uri").InvalidIriError} If `uri` isn't an IRI.
 */
export const toId = (uri) => {
  assertIri(uri);
  return normalizeIri(toAbsoluteIri(uri));
};

/**
 * The {@link Id} a reference from a document identifies, like `$id`'s,
 * resolved against `base`, which doesn't have to be normalized. Its
 * fragment is dropped.
 *
 * @type (reference: string, base: AbsoluteIri | undefined) => Id
 * @throws {import("@hyperjump/uri").InvalidIriError} If `reference` isn't an
 *   IRI-reference, or resolving it breaks its scheme's rules.
 * @throws {Error} If `reference` is relative and there's no `base`.
 */
export const resolveId = (reference, base) => {
  assertIriReference(reference);
  if (hasScheme(reference)) {
    return normalizeIri(toAbsoluteIri(reference));
  } else if (base === undefined) {
    throw Error(`'${reference}' is relative, and there's no base URI to resolve it against`);
  }

  return normalizeIri(toAbsoluteIri(resolveIri(reference, base)));
};

/**
 * What's wrong with a value that isn't a valid identifier, for a message
 * that already shows the value, like `" " isn't allowed in a host, at 9`.
 * An `InvalidIriError` says it after the rule and the value, which are
 * left out. Any other error is its message.
 *
 * @type (error: unknown) => string
 */
export const iriProblem = (error) => {
  if (!(error instanceof InvalidIriError)) {
    return /** @type Error */ (error).message;
  }

  return error.message.slice(`Invalid ${error.rule}: ${error.value} — `.length);
};

/**
 * Where a message about a string that isn't a valid identifier goes: on the
 * characters an `InvalidIriError` says are wrong, if it's about the string
 * as it's written, or else on the whole string. The string's text is its
 * value in quotes only if it has no escapes, which is when it's two longer
 * than its value. Positions and `InvalidIriError`'s indexes are both UTF-16.
 * Something missing, like a scheme, is on the whole string, because it's
 * nowhere in particular.
 *
 * @type (node: Node, error: unknown) => Position | undefined
 */
export const iriPlace = (node, error) => {
  const { position } = node;
  const value = /** @type {{ value?: unknown }} */ (node).value;
  if (!(error instanceof InvalidIriError) || value !== error.value || error.start === error.end
    || position?.start.offset === undefined || position.end.offset === undefined
    || position.end.offset - position.start.offset !== error.value.length + 2) {
    return position;
  }

  const { start } = position;
  /** @type (index: number) => Point */
  const at = (index) => ({ line: start.line, column: start.column + 1 + index, offset: /** @type number */ (start.offset) + 1 + index });
  return { start: at(error.start), end: at(error.end) };
};
