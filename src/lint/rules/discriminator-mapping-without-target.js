import { encodeIriFragment, getFragment, isIriReference, normalizeIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { AbsoluteIri, Iri } from "@hyperjump/uri"
 * @import { JsonErrorNode } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 * @import { LintDocument } from "../document.d.ts"
 */

const discriminatorUris = ["3.1", "3.2"].map((version) => `https://spec.openapis.org/oas/${version}/keyword/discriminator`);

/** What the Components Object's keys MUST match */
const componentName = /^[a-zA-Z0-9.\-_]+$/;

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const discriminatorMappingWithoutTarget = lintRule({ origin: "json-schema-lint:discriminator-mapping-without-target", url: "https://hyperjump.io/json-schema/linting/rules/discriminator-mapping-without-target/" }, async (tree, file) => {
  // Schema names are the keys of an OpenAPI document's `components.schemas`
  const names = schemaNames(tree);
  if (names === undefined) {
    return;
  }

  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const uri of discriminatorUris) {
    visitKeywords(tree, uri, (keywordNode, schemaNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "object") {
        // The keyword's check reports it
        return;
      }

      for (const property of valueNode.children) {
        const [fieldNode, fieldValueNode] = property.children;
        /** @type [JsonSchemaNode, string][] */
        const values = [];
        if (fieldNode.value === "mapping" && fieldValueNode.jsonType === "object") {
          for (const entry of fieldValueNode.children) {
            values.push([entry.children[1], `'mapping' for '${entry.children[0].value}'`]);
          }
        } else if (fieldNode.value === "defaultMapping") {
          values.push([fieldValueNode, "'defaultMapping'"]);
        }

        for (const [targetNode, label] of values) {
          if (targetNode.jsonType === "string" && !finds(targetNode.value, schemaNode, names, tree, document)) {
            // A value that can be a name is read as one, so a URI reference
            // like it needs `./`, which OpenAPI says authors MUST add
            const advice = componentName.test(targetNode.value) ? ` To refer to a schema by its URI, write './${targetNode.value}'.` : "";
            file.message(`${label} is '${targetNode.value}', which isn't a schema name in 'components.schemas' or a URI reference to a schema.${advice}`, { place: targetNode.position });
          }
        }
      }
    });
  }
});

export default discriminatorMappingWithoutTarget;

/**
 * Whether a `mapping` value finds a schema. A value that can be a schema
 * name is one, as OpenAPI RECOMMENDS when it could be either, and a URI
 * reference needs `./` to be read as one. Anything else is a URI
 * reference, resolved against the base URI of the schema the
 * `discriminator` is in. One in another document can't be checked, because
 * lint doesn't retrieve anything, so it's taken to find one.
 *
 * @type (value: string, schemaNode: JsonSchemaNode, names: Set<string>, tree: JsonSchemaDocumentNode, document: LintDocument) => boolean
 */
const finds = (value, schemaNode, names, tree, document) => {
  if (componentName.test(value)) {
    return names.has(value);
  } else if (!isIriReference(value)) {
    return false;
  }

  let resolved;
  try {
    resolved = /** @type Iri */ (resolveIri(value, /** @type AbsoluteIri */ (toAbsoluteIri(schemaNode.location))));
  } catch {
    return false;
  }

  const resource = tree.embedded[normalizeIri(toAbsoluteIri(resolved))];
  if (resource === undefined) {
    return true;
  }

  const fragment = getFragment(resolved) ?? "";
  const pointer = fragment === "" || fragment.startsWith("/") ? undefined : resource.anchors[fragment];
  const location = pointer === undefined
    ? normalizeIri(/** @type Iri */ (`${resource.uri}#${fragment}`))
    : `${resource.uri}#${encodeIriFragment(pointer)}`;
  return document.schemaNodes.has(location);
};

/**
 * The names of an OpenAPI document's schemas, or undefined if the tree isn't
 * an OpenAPI document
 *
 * @type (tree: JsonSchemaDocumentNode) => Set<string> | undefined
 */
const schemaNames = (tree) => {
  const root = tree.children[0];
  if (root === undefined || root.type !== "json" || root.jsonType !== "object"
    || !root.children.some((property) => property.children[0].value === "openapi")) {
    return;
  }

  const schemas = propertyOf(propertyOf(root, "components"), "schemas");
  return new Set(schemas !== undefined && "jsonType" in schemas && schemas.jsonType === "object"
    ? schemas.children.map((property) => property.children[0].value)
    : []);
};

/** @type (node: JsonSchemaTolerantNode | JsonErrorNode | undefined, name: string) => JsonSchemaTolerantNode | JsonErrorNode | undefined */
const propertyOf = (node, name) => {
  if (node === undefined || !("jsonType" in node) || node.jsonType !== "object") {
    return;
  }
  return node.children.find((property) => property.children[0].value === name)?.children[1];
};
