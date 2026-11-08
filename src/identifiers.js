import { assertIri, assertIriReference, hasScheme, normalizeIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";

/**
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
