import type { VFile } from "vfile";
import type { Dialect } from "../dialect.d.ts";
import type { Definitions } from "../kernel/definitions.js";
import type { KeywordGroup } from "../kernel/kernel.d.ts";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { FindSchemaResult } from "./find-schema.d.ts";
import type { LintSchemas } from "./lower.d.ts";

/**
 * A document that's linted, with everything rules read about it and the
 * schemas it reaches. It's data: the helpers that take it, like
 * `schemaGroup` and `effectOf`, are synchronous functions of it.
 */
export type LintDocument = {
  tree: JsonSchemaDocumentNode;

  /**
   * What every object schema in the document lowers to
   * (`design/specs/kernel/lowering-for-lint.md`), without compiling or
   * retrieving anything, in document order. A subschema is `apply` of its
   * location, and a reference is `apply` of the URI it resolves to. The
   * dynamic anchors of a resource in the document are known, so a dynamic
   * reference into one that isn't lowers to `dynamicApply`. A keyword whose
   * value doesn't fit its shape, or that can't be lowered, has no group, and
   * neither does one without `lower`, like `$defs`. A schema whose dialect
   * isn't known isn't included.
   */
  schemas: LintSchemas;

  /**
   * What the object schemas of this document and of every document its
   * references reach lower to, lowered the same way
   */
  reached: LintSchemas;

  /**
   * What each static reference in these documents finds (`findSchema`), by
   * the URI it refers to, and what the identifier of the schema each of this
   * document's references finds finds. See `visitReferences`.
   */
  found: ReadonlyMap<string, FindSchemaResult>;

  /** Every schema in these documents, by its location */
  schemaNodes: ReadonlyMap<string, JsonSchemaNode>;

  /** The dialect of each schema in these documents, by URI, or undefined if it isn't known */
  dialects: ReadonlyMap<string, Dialect | undefined>;

  /**
   * The keywords and formats these documents use that the JSON Schema
   * definitions have, by URI
   */
  definitions: Definitions;
};

/**
 * The document a rule is given, with what it reaches. Everything that's
 * retrieved is retrieved here, in the session the schema was resolved in
 * (`file.data.jsonSchemaSession`), so only what's in its registries and
 * what `allowRetrieval` allows is seen. It's undefined if the schema wasn't
 * resolved. It's found once for each tree and session, so rules share it,
 * and a document it reaches is lowered once for each session.
 */
export const documentForLint: (tree: JsonSchemaDocumentNode, file: VFile) => Promise<LintDocument | undefined>;

/**
 * The schema a URI finds, the way a reference does: what it finds in
 * `found`, or else the schema at that location in these documents. It's
 * undefined if there isn't one, or it isn't known.
 */
export const schemaAt: (document: LintDocument, uri: string) => JsonSchemaNode | undefined;

/**
 * The keyword groups of an object schema in a document, in the order
 * they're evaluated, lowered as `LintDocument.schemas` are, without
 * caching. It's for a schema that isn't in the document as it is, like
 * one a rule builds from others' keywords, whose subschemas are nodes in
 * the document. It's undefined if the schema isn't an object or its
 * dialect isn't known.
 */
export const lowerSchemaForLint: (document: LintDocument, schemaNode: JsonSchemaNode) => Promise<KeywordGroup[] | undefined>;
