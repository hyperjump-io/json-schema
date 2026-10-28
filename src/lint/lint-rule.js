import { lintRule as unifiedLintRule } from "unified-lint-rule";
import unknownKeyword from "../keywords/unknown.js";
import { visitKeywords } from "./utilities.js";

/**
 * @import { Point, Position } from "unist"
 * @import { Processor } from "unified"
 * @import { VFile } from "vfile"
 * @import { Meta, Plugin, Rule } from "unified-lint-rule"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

/**
 * A `$comment` directive. It covers the schema it's in, from `start` to
 * `end`. `enabled` is undefined for a directive that isn't
 * `json-schema-lint-disable` or `json-schema-lint-enable`, which is only
 * reported. `ruleIds` is undefined if it covers every rule.
 *
 * @typedef {{
 *   name: string;
 *   enabled?: boolean;
 *   ruleIds?: string[];
 *   start: number;
 *   end: number;
 *   node: JsonSchemaNode;
 * }} Directive
 */

// `$comment` is a comment in dialects that don't have it too, where it's an
// unknown keyword
const commentUris = ["https://json-schema.org/keyword/comment", `${unknownKeyword.uri}#$comment`];

const directivePrefix = "json-schema-lint-";

/** @type Record<string, boolean> */
const directiveStates = {
  "json-schema-lint-disable": false,
  "json-schema-lint-enable": true
};

/**
 * Every rule reads the same directives, so they're found once per tree
 *
 * @type WeakMap<JsonSchemaDocumentNode, Directive[]>
 */
const directivesByTree = new WeakMap();

/**
 * The IDs of the rules made with `lintRule` that are used by a processor,
 * including ones that are off. A directive can only name one of these.
 *
 * @type WeakMap<Processor, Set<string>>
 */
const knownRuleIds = new WeakMap();

/**
 * Files whose directives have been checked. The first rule to run checks
 * them, so each problem is reported once.
 *
 * @type WeakSet<VFile>
 */
const checkedFiles = new WeakSet();

/**
 * @template [Option=unknown]
 * @param {Meta | string} meta
 * @param {Rule<JsonSchemaDocumentNode, Option>} rule
 * @returns {Plugin<JsonSchemaDocumentNode, Option>}
 */
export const lintRule = (meta, rule) => {
  const origin = typeof meta === "string" ? meta : meta.origin;
  const ruleId = origin.split(":")[1] ?? origin;
  const plugin = unifiedLintRule(meta, rule);

  /**
   * @this {Processor}
   * @param {Parameters<Plugin<JsonSchemaDocumentNode, Option>>[0]} config
   */
  function attacher(config) {
    const known = knownRuleIds.get(this) ?? new Set();
    knownRuleIds.set(this, known);
    known.add(ruleId);

    const transform = plugin.call(this, config);
    if (transform === undefined) {
      return;
    }

    /** @type ReturnType<Plugin<JsonSchemaDocumentNode, Option>> */
    const transformer = (tree, file, next) => {
      // Before the rule runs, because `unified-lint-rule` gives every
      // message added while the rule runs the rule's ID
      checkDirectives(tree, file, known);

      const from = file.messages.length;
      transform(tree, file, (error, ...rest) => {
        if (error === undefined) {
          removeDisabled(tree, file, from, ruleId);
          sortMessages(file, from);
        }
        next(error, ...rest);
      });
    };

    return transformer;
  }

  Object.defineProperty(attacher, "name", { value: origin });
  return attacher;
};

/** @type (tree: JsonSchemaDocumentNode) => Directive[] */
const directives = (tree) => {
  let result = directivesByTree.get(tree);
  if (result === undefined) {
    /** @type Directive[] */
    const found = [];
    for (const commentUri of commentUris) {
      visitKeywords(tree, commentUri, (keywordNode, schemaNode) => {
        const valueNode = keywordNode.children[1];
        const start = schemaNode.position?.start.offset;
        const end = schemaNode.position?.end.offset;
        if (valueNode.jsonType !== "string" || start === undefined || end === undefined) {
          return;
        }

        const [name, ...ruleIds] = valueNode.value.trim().split(/\s+/);
        if (name.startsWith(directivePrefix)) {
          found.push({
            name: name,
            enabled: directiveStates[name],
            ruleIds: ruleIds.length === 0 ? undefined : ruleIds,
            start: start,
            end: end,
            node: valueNode
          });
        }
      });
    }
    result = found;
    directivesByTree.set(tree, result);
  }

  return result;
};

/** @type (tree: JsonSchemaDocumentNode, file: VFile, known: Set<string>) => void */
const checkDirectives = (tree, file, known) => {
  if (checkedFiles.has(file)) {
    return;
  }
  checkedFiles.add(file);

  for (const directive of directives(tree)) {
    const place = directive.node.position;
    if (directive.enabled === undefined) {
      file.message(`Unknown directive '${directive.name}'. Expected 'json-schema-lint-disable' or 'json-schema-lint-enable'.`, {
        place: place,
        ruleId: "unknown-directive",
        source: "json-schema-lint"
      });
      continue;
    }

    for (const ruleId of directive.ruleIds ?? []) {
      if (!known.has(ruleId)) {
        file.message(`Unknown rule '${ruleId}' in '${directive.name}'`, {
          place: place,
          ruleId: "unknown-rule",
          source: "json-schema-lint"
        });
      }
    }
  }
};

/** @type (place: Point | Position | undefined) => number | undefined */
const startOffset = (place) => {
  if (place === undefined) {
    return;
  }

  return "start" in place ? place.start.offset : place.offset;
};

/**
 * Whether a rule is on at an offset. The innermost schema with a directive
 * that covers the rule decides. Rules are on where none does.
 *
 * @type (applicable: Directive[], offset: number) => boolean
 */
const isEnabled = (applicable, offset) => {
  /** @type Directive | undefined */
  let innermost;
  for (const directive of applicable) {
    if (directive.start <= offset && offset < directive.end && (innermost === undefined || directive.start >= innermost.start)) {
      innermost = directive;
    }
  }

  return innermost?.enabled ?? true;
};

/**
 * Puts the messages a rule added in document order. Rules that work from
 * what keywords lower to find things in the order the operations are in.
 * The sort is stable, so messages in the same place stay in the order
 * they were found, and ones without a position go last.
 *
 * @type (file: VFile, from: number) => void
 */
const sortMessages = (file, from) => {
  const sorted = file.messages.slice(from).toSorted((a, b) => {
    return (startOffset(a.place) ?? Infinity) - (startOffset(b.place) ?? Infinity);
  });
  file.messages.splice(from, sorted.length, ...sorted);
};

/** @type (tree: JsonSchemaDocumentNode, file: VFile, from: number, ruleId: string) => void */
const removeDisabled = (tree, file, from, ruleId) => {
  const applicable = directives(tree).filter((directive) => {
    return directive.enabled !== undefined && (directive.ruleIds === undefined || directive.ruleIds.includes(ruleId));
  });
  if (applicable.length === 0) {
    return;
  }

  for (let index = file.messages.length - 1; index >= from; index--) {
    const offset = startOffset(file.messages[index].place);
    if (offset !== undefined && !isEnabled(applicable, offset)) {
      file.messages.splice(index, 1);
    }
  }
};
