import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const falseThenElse = lintRule({ origin: "json-schema-lint:false-then-else", url: "https://hyperjump.io/json-schema/linting/rules/false-then-else/" }, (tree, file) => {
  visitKeywords(tree, `${keyword}/if`, (ifNode, schemaNode) => {
    const thenNode = findKeyword(schemaNode, `${keyword}/then`);
    const elseNode = findKeyword(schemaNode, `${keyword}/else`);
    const ifName = `'${ifNode.children[0].value}'`;

    if (thenNode && elseNode && isFalse(thenNode) && isFalse(elseNode)) {
      // On whichever comes second, the one that makes nothing valid
      const second = /** @type number */ (thenNode.position?.start.offset) < /** @type number */ (elseNode.position?.start.offset) ? elseNode : thenNode;
      file.message(`'${thenNode.children[0].value}' and '${elseNode.children[0].value}' are both false, so nothing is valid`, { place: second.position });
    } else if (thenNode && !elseNode && isFalse(thenNode)) {
      file.message(`${ifName} with a false '${thenNode.children[0].value}' is the same as 'not' with the ${ifName} schema`, { place: thenNode.position });
    } else if (elseNode && !thenNode && isFalse(elseNode)) {
      file.message(`${ifName} with a false '${elseNode.children[0].value}' is the same as the ${ifName} schema on its own`, { place: elseNode.position });
    }
  });
});

export default falseThenElse;

/** @type (keywordNode: JsonSchemaKeywordNode | undefined) => boolean */
const isFalse = (keywordNode) => {
  const valueNode = keywordNode?.children[1];
  return valueNode?.jsonType === "boolean" && !valueNode.value;
};
