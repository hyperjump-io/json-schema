import { astInstance } from "../../kernel/instance.js";
import { instanceEqual } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { InstanceNode } from "../../kernel/instance.js"
 */

const constUri = "https://json-schema.org/keyword/const";
const enumUri = "https://json-schema.org/keyword/enum";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const constAndEnum = lintRule({ origin: "jsonschema-lint:const-and-enum" }, (tree, file) => {
  visitKeywords(tree, constUri, (constNode, schemaNode) => {
    const enumNode = findKeyword(schemaNode, enumUri);
    const constValue = /** @type InstanceNode */ (constNode.children[1]);
    const enumValue = enumNode?.children[1];
    if (enumNode === undefined || enumValue?.jsonType !== "array" || astInstance.typeOf(constValue) === undefined) {
      return;
    }

    const constName = constNode.children[0].value;
    const enumName = enumNode.children[0].value;
    /** @type (unparsed: boolean) => boolean */
    const inEnum = (unparsed) => enumValue.children.some((itemNode) => {
      return instanceEqual(astInstance, constValue, astInstance, /** @type InstanceNode */ (itemNode), unparsed);
    });

    if (inEnum(false)) {
      file.message(`'${enumName}' has no effect, because '${constName}' allows only one value, which is in it`, { place: enumNode.position });
    } else if (!inEnum(true)) {
      // Whether a value that couldn't be parsed is equal to the const value
      // is unknown, so it's only a contradiction if there isn't one.
      // On whichever comes second, the one that contradicts the other
      const place = /** @type number */ (constNode.position?.start.offset) < /** @type number */ (enumNode.position?.start.offset)
        ? enumNode.position
        : constNode.position;
      file.message(`The '${constName}' value isn't in '${enumName}', so nothing is valid`, { place });
    }
  });
});

export default constAndEnum;
