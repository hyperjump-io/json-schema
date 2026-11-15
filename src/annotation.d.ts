import type { Json } from "@hyperjump/browser";
import type { Data } from "unist";
import type { JsonSchemaConfig } from "./json-schema.d.ts";

/**
 * The values a keyword annotated a node with, one for every schema
 * location where it applied, from `annotate` or `annotator`. The node can
 * be a property name, which `propertyNames` annotates. A node the keyword
 * didn't annotate has none.
 *
 * The keyword is a keyword URI, if the config's JSON Schema media types
 * have a keyword with that URI, or a name in the dialect, which is v1 by
 * default. A name that isn't a keyword in the dialect is an unknown keyword.
 * An unknown keyword's URI is `https://json-schema.org/keyword/unknown#`
 * followed by its name.
 *
 * The dialect has to be one the media types were made with. An annotation
 * of a dialect a meta-schema defines is read by its keyword URI.
 *
 * The AST is a unist tree, so unist utilities such as `unist-util-visit`
 * can find the nodes that have an annotation.
 *
 * @throws Error if a name is given and the dialect isn't one the media
 * types were made with.
 */
export const annotation: <A extends Json = Json>(config: JsonSchemaConfig, node: { data?: Data }, keyword: string, dialectUri?: string) => A[];
