import { isIri } from "@hyperjump/json-schema-formats";
import { annotationKeyword } from "../../utilities.js";
import { boolean, expected, objectOf, string } from "../../checks.js";

/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {"element" | "attribute" | "text" | "cdata" | "none"} NodeType
 *
 * @typedef {{
 *   nodeType?: NodeType;
 *   name?: string;
 *   namespace?: string;
 *   prefix?: string;
 *   attribute?: boolean;
 *   wrapped?: boolean;
 * }} Xml
 */

const nodeTypes = ["element", "attribute", "text", "cdata", "none"];

const fields = objectOf({
  nodeType: expected(`one of ${nodeTypes.map((type) => `'${type}'`).join(", ")}`, (node) => node.jsonType === "string" && nodeTypes.includes(node.value)),
  name: string,
  namespace: expected("an absolute IRI", (node) => node.jsonType === "string" && isIri(node.value)),
  prefix: string,
  attribute: boolean,
  wrapped: boolean
});

/**
 * `xml` in OpenAPI 3.2, an XML Object. It's 3.1's, with `nodeType`, which
 * replaces `attribute` and `wrapped`, so they can't be used with it. Its
 * `namespace` is an absolute IRI.
 *
 * @type Keyword<Xml, "data">
 */
export default annotationKeyword("https://spec.openapis.org/oas/3.2/keyword/xml", (valueNode, context) => {
  fields(valueNode, context);
  if (valueNode.jsonType !== "object") {
    return;
  }

  const names = valueNode.children.map((property) => property.children[0].value);
  if (names.includes("nodeType")) {
    for (const property of valueNode.children) {
      const nameNode = property.children[0];
      if (nameNode.value === "attribute" || nameNode.value === "wrapped") {
        context.message(`'${nameNode.value}' can't be used with 'nodeType'`, property);
      }
    }
  }
});
