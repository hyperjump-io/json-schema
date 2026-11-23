import type { Node, Position } from "unist";
import type { AbsoluteIri, NormalizedIri } from "@hyperjump/uri";

/**
 * An identifier as it's kept: absolute and normalized, so equivalent
 * identifiers are the same key. Resources, dialects, vocabularies, and
 * registry entries are kept by one. A document that a resolver other than
 * this one makes, like an OpenAPI document, is kept by one too.
 */
export type Id = AbsoluteIri & NormalizedIri;

/**
 * The URL given to JSON that isn't from anywhere, like an instance, or
 * schema text before it's resolved, because browser's documents have to
 * have one. Nothing reads it.
 */
export const noUrl: string;

/**
 * The {@link Id} of an identifier from outside, like an application's or a
 * config's, such as the URI a document was retrieved from.
 *
 * @throws {import("@hyperjump/uri").InvalidIriError} If `uri` isn't an IRI.
 */
export const toId: (uri: string) => Id;

/**
 * The {@link Id} a reference from a document identifies, like `$id`'s,
 * resolved against `base`, which doesn't have to be normalized. Its
 * fragment is dropped.
 *
 * @throws {import("@hyperjump/uri").InvalidIriError} If `reference` isn't an
 *   IRI-reference, or resolving it breaks its scheme's rules.
 * @throws {Error} If `reference` is relative and there's no `base`.
 */
export const resolveId: (reference: string, base: AbsoluteIri | undefined) => Id;

/**
 * What's wrong with a value that isn't a valid identifier, for a message
 * that already shows the value, like `" " isn't allowed in a host, at 9`.
 * Any error that isn't an `InvalidIriError` is its message.
 */
export const iriProblem: (error: unknown) => string;

/**
 * Where a message about a string node that isn't a valid identifier goes:
 * on the characters that are wrong, if it can tell, or else on the whole
 * string.
 */
export const iriPlace: (node: Node, error: unknown) => Position | undefined;
