/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 */

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/** @type (tree: JsonSchemaDocumentNode, visitor: (node: TreeNode) => void) => void */
const visitNodes = (tree, visitor) => {
  /** @type (node: TreeNode) => void */
  const visit = (node) => {
    visitor(node);
    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  visit(/** @type TreeNode */ (tree));
};

/**
 * Call `visitor` with every schema in the document, including embedded
 * resources, which stay in the tree. Schemas inside values that couldn't be
 * parsed aren't schemas, so they aren't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (schemaNode: JsonSchemaNode) => void) => void
 */
export const visitSchemas = (tree, visitor) => {
  visitNodes(tree, (node) => {
    if (node.type === "json-schema") {
      visitor(/** @type JsonSchemaNode */ (node));
    }
  });
};

/**
 * Call `visitor` with every reference in the document and the absolute URI
 * it refers to. That's the value of a keyword whose shape is `"reference"`
 * (`$ref` since 2019-09, 2020-12's `$dynamicRef`, `$recursiveRef`), or a
 * schema that's a reference (`$ref` in draft-04 through draft-07). The
 * resolver gives both the URI as `href`. `node` is the keyword's value or
 * the reference. A value that isn't a valid IRI reference is a schema
 * problem, so it isn't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (uri: string, node: JsonSchemaNode) => void) => void
 */
export const visitReferences = (tree, visitor) => {
  visitNodes(tree, (node) => {
    const referenceNode = /** @type JsonSchemaNode */ (node);
    if ((referenceNode.type === "reference" || referenceNode.type === "json") && referenceNode.href !== undefined) {
      visitor(referenceNode.href, referenceNode);
    }
  });
};

/** Each official dialect's URI as its meta-schema identifies itself, by the URI without a fragment */
const canonicalDialectUris = new Map([
  "http://json-schema.org/draft-04/schema#",
  "http://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft/2019-09/schema",
  "https://json-schema.org/draft/2020-12/schema",
  "https://json-schema.org/v1"
].map((uri) => [uri.replace(/#$/, ""), uri]));

/**
 * An official dialect's URI as its meta-schema identifies itself, like
 * draft-07's with an empty fragment, by its URI without a fragment. It's
 * undefined for any other dialect.
 *
 * @type (dialectUri: string) => string | undefined
 */
export const canonicalDialectUri = (dialectUri) => canonicalDialectUris.get(dialectUri);

const schemaUri = "https://json-schema.org/keyword/schema";

/**
 * Call `visitor` with the value of every `$schema` in the document that's a
 * string. In draft-04 through draft-07, a schema with `$ref` is a reference,
 * whose properties aren't keywords, but its `$schema` still decides its
 * dialect, so it's visited too.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (valueNode: JsonSchemaNode & { jsonType: "string" }) => void) => void
 */
export const visitDialectUris = (tree, visitor) => {
  visitNodes(tree, (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    if ((schemaNode.type !== "json-schema" && schemaNode.type !== "reference") || schemaNode.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const isSchema = schemaNode.type === "reference" ? property.children[0].value === "$schema" : property.keywordUri === schemaUri;
      const valueNode = property.children[1];
      if (isSchema && valueNode.jsonType === "string") {
        visitor(valueNode);
      }
    }
  });
};

/**
 * Call `visitor` with every keyword in the document with the given keyword
 * URI and the schema it's in. Keywords are found by URI, never by name, so
 * this works in every dialect that has the keyword and finds nothing in one
 * that doesn't.
 *
 * @type (tree: JsonSchemaDocumentNode, keywordUri: string, visitor: (keywordNode: JsonSchemaKeywordNode, schemaNode: JsonSchemaNode) => void) => void
 */
export const visitKeywords = (tree, keywordUri, visitor) => {
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (property.keywordUri === keywordUri) {
        visitor(property, schemaNode);
      }
    }
  });
};

/**
 * A keyword in a schema, by keyword URI. It's undefined if the schema
 * doesn't have the keyword or isn't an object. Use it instead of
 * `siblingKeyword` when you need the keyword's name or position, not just
 * its value.
 *
 * @type (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaKeywordNode | undefined
 */
export const findKeyword = (schemaNode, keywordUri) => {
  if (schemaNode.jsonType !== "object") {
    return;
  }

  for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
    if (property.keywordUri === keywordUri) {
      return property;
    }
  }
};

/**
 * The value of a keyword in a schema, by keyword URI, such as `if` for
 * `then`. It's undefined if the schema doesn't have the keyword or isn't an
 * object.
 *
 * @type (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaNode | undefined
 */
export const siblingKeyword = (schemaNode, keywordUri) => findKeyword(schemaNode, keywordUri)?.children[1];

const requiredUris = [
  "https://json-schema.org/keyword/required",
  "https://json-schema.org/keyword/draft-04/required"
];

/**
 * A schema's `required` keyword and the distinct property names it
 * requires. Items that aren't strings are a schema problem, so they're
 * left out. It's undefined if the schema doesn't have `required` or its
 * value isn't an array.
 *
 * @type (schemaNode: JsonSchemaNode) => { keywordNode: JsonSchemaKeywordNode; names: Set<string> } | undefined
 */
export const requiredNames = (schemaNode) => {
  for (const requiredUri of requiredUris) {
    const keywordNode = findKeyword(schemaNode, requiredUri);
    const valueNode = keywordNode?.children[1];
    if (keywordNode === undefined || valueNode?.jsonType !== "array") {
      continue;
    }

    /** @type Set<string> */
    const names = new Set();
    for (const itemNode of valueNode.children) {
      if (itemNode.jsonType === "string") {
        names.add(itemNode.value);
      }
    }

    return { keywordNode, names };
  }
};

const typeUris = [
  "https://json-schema.org/keyword/type",
  "https://json-schema.org/keyword/draft-2020-12/type"
];

/**
 * A schema's `type` keyword, in any dialect, and the types it allows. It's
 * undefined if the schema doesn't have `type`, or its value isn't a string
 * or a non-empty array of strings. An empty array allows nothing, which the
 * empty-type rule reports.
 *
 * @type (schemaNode: JsonSchemaNode) => { keywordNode: JsonSchemaKeywordNode; names: Set<string> } | undefined
 */
export const typeNames = (schemaNode) => {
  for (const typeUri of typeUris) {
    const keywordNode = findKeyword(schemaNode, typeUri);
    if (keywordNode === undefined) {
      continue;
    }

    const valueNode = keywordNode.children[1];
    const itemNodes = valueNode.jsonType === "array" ? valueNode.children : [valueNode];
    if (itemNodes.length === 0) {
      return;
    }

    /** @type Set<string> */
    const names = new Set();
    for (const itemNode of itemNodes) {
      if (itemNode.jsonType !== "string") {
        return;
      }
      names.add(itemNode.value);
    }

    return { keywordNode, names };
  }
};

/**
 * Whether `type` allows a value, as the `type` keyword decides it, given the
 * types from {@link typeNames}. A number with no fractional part, including
 * one written like `1.0`, is an `integer`. It's undefined for a value that
 * couldn't be parsed.
 *
 * @type (names: Set<string>, valueNode: JsonSchemaTolerantNode) => boolean | undefined
 */
export const typeAllows = (names, valueNode) => {
  if (!("jsonType" in valueNode)) {
    return;
  }

  const type = valueNode.jsonType;
  return names.has(type) || (type === "number" && names.has("integer") && Number.isInteger(valueNode.value));
};

const keyword = "https://json-schema.org/keyword";

/** @type Map<string, RegExp | null> */
const patterns = new Map();

/**
 * @typedef {{ keywordNode: JsonSchemaKeywordNode; valueNode: JsonSchemaNode }} PropertySchema
 */

/**
 * A `patternProperties` pattern as the keyword compiles it, with the `u`
 * flag. It's null if the pattern isn't valid.
 *
 * @type (pattern: string) => RegExp | null
 */
const compilePattern = (pattern) => {
  let regExp = patterns.get(pattern);
  if (regExp === undefined) {
    try {
      regExp = new RegExp(pattern, "u");
    } catch {
      regExp = null;
    }
    patterns.set(pattern, regExp);
  }

  return regExp;
};

/**
 * The schemas in a schema's `properties`, `patternProperties`, and
 * `additionalProperties` that apply to a property with the given name, each
 * with the keyword it's in. `additionalProperties` applies only if the
 * others don't. It's undefined if a pattern isn't valid, because then
 * what applies is unknown.
 *
 * @type (schemaNode: JsonSchemaNode, name: string) => PropertySchema[] | undefined
 */
export const propertySchemas = (schemaNode, name) => {
  /** @type PropertySchema[] */
  const result = [];

  const propertiesNode = findKeyword(schemaNode, `${keyword}/properties`);
  const propertiesValue = propertiesNode?.children[1];
  if (propertiesNode && propertiesValue?.jsonType === "object") {
    for (const property of propertiesValue.children) {
      if (property.children[0].value === name) {
        result.push({ keywordNode: propertiesNode, valueNode: /** @type JsonSchemaNode */ (property.children[1]) });
      }
    }
  }

  const patternPropertiesNode = findKeyword(schemaNode, `${keyword}/patternProperties`);
  const patternPropertiesValue = patternPropertiesNode?.children[1];
  if (patternPropertiesNode && patternPropertiesValue?.jsonType === "object") {
    for (const property of patternPropertiesValue.children) {
      const regExp = compilePattern(property.children[0].value);
      if (regExp === null) {
        return;
      } else if (regExp.test(name)) {
        result.push({ keywordNode: patternPropertiesNode, valueNode: /** @type JsonSchemaNode */ (property.children[1]) });
      }
    }
  }

  const additionalPropertiesNode = findKeyword(schemaNode, `${keyword}/additionalProperties`);
  if (result.length === 0 && additionalPropertiesNode) {
    result.push({ keywordNode: additionalPropertiesNode, valueNode: /** @type JsonSchemaNode */ (additionalPropertiesNode.children[1]) });
  }

  return result;
};
