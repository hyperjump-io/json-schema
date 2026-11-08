import { hasScheme, resolveIri, toAbsoluteIri, toRelativeIri } from "@hyperjump/uri";
import { toId } from "../identifiers.js";
import { mapSubexpressions } from "./kernel.js";

/**
 * @import { IriReference, NormalizedIri } from "@hyperjump/uri"
 * @import { Expression, Kernel } from "./kernel.d.ts"
 */

/**
 * A kernel with every URI in it mapped: the entry, the schemas' handles and
 * resources, keyword locations and sources, the schemas `apply` and
 * `dynamicApply` name, and dynamic anchors
 *
 * @type (kernel: Kernel, map: (uri: string) => string) => Kernel
 */
const mapUris = (kernel, map) => {
  /** @type (expression: Expression) => Expression */
  const mapExpression = (expression) => {
    if (expression.op === "apply") {
      return { ...expression, schema: map(expression.schema) };
    } else if (expression.op === "dynamicApply") {
      return expression.fallback === null ? expression : { ...expression, fallback: map(expression.fallback) };
    }
    return mapSubexpressions(expression, mapExpression);
  };

  /** @type Kernel["schemas"] */
  const schemas = {};
  for (const [handle, schema] of Object.entries(kernel.schemas)) {
    if (typeof schema === "boolean") {
      schemas[map(handle)] = schema;
      continue;
    }

    schemas[map(handle)] = {
      ...schema,
      resource: map(schema.resource),
      ...schema.copyOf !== undefined && { copyOf: map(schema.copyOf) },
      keywords: schema.keywords.map((keyword) => ({
        ...keyword,
        location: map(keyword.location),
        sources: keyword.sources.map(map),
        expression: mapExpression(keyword.expression)
      }))
    };
  }

  /** @type Kernel["resources"] */
  const resources = {};
  for (const [uri, { dynamicAnchors }] of Object.entries(kernel.resources)) {
    resources[map(uri)] = {
      dynamicAnchors: Object.fromEntries(Object.entries(dynamicAnchors).map(([anchor, handle]) => [anchor, map(handle)]))
    };
  }

  return {
    ...kernel,
    uri: map(kernel.uri),
    schemas,
    resources,
    reads: { evaluated: kernel.reads.evaluated.map(map), dynamicScope: kernel.reads.dynamicScope.map(map) }
  };
};

/**
 * A kernel with its `file:` URIs relative to the entry's document, so it
 * doesn't say where the files are, and it can be restored wherever they're
 * moved to, as long as they're laid out the same. A URI in the entry's
 * document is only its fragment, like `#/properties/name`, so the entry's
 * document can be renamed too. Other URIs are absolute. A compiled kernel's
 * URIs are its schemas' locations, which are normalized IRIs, so they aren't
 * checked or normalized again.
 *
 * @type (kernel: Kernel) => Kernel
 */
export const withRelativeFileUris = (kernel) => {
  if (!/^file:/i.test(kernel.uri)) {
    return kernel;
  }

  const base = toAbsoluteIri(/** @type NormalizedIri */ (kernel.uri));
  return mapUris(kernel, (uri) => /^file:/i.test(uri) ? toRelativeIri(/** @type NormalizedIri */ (uri), base) : uri);
};

/**
 * A kernel with its relative URIs resolved against where the entry's
 * document is now. Without it, they stay relative, which is still a
 * consistent set of handles to evaluate with. A serialized kernel's handles
 * are its locations, some made relative, so each is an IRI-reference.
 * They aren't checked, because `restore` trusts the rest of the kernel too.
 *
 * @type (kernel: Kernel, uri: string | undefined) => Kernel
 */
export const withResolvedUris = (kernel, uri) => {
  if (uri === undefined) {
    return kernel;
  }

  const base = toId(uri);
  return mapUris(kernel, (handle) => {
    const reference = /** @type IriReference */ (handle);
    return hasScheme(reference) ? reference : resolveIri(reference, base);
  });
};
