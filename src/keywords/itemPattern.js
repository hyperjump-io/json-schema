import keywordSchema from "./itemPattern.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle, Shape } from "../keyword.d.ts"
 * @import { JsonSchemaNode } from "../schema-ast.d.ts"
 * @import { Json } from "@hyperjump/browser/json"
 */

/**
 * A state of the NFA an item pattern compiles to. A state either moves to
 * `next` for an item that passes `handle`, or moves to its `epsilon` states
 * without consuming an item.
 *
 * @typedef {{
 *   end: boolean;
 *   epsilon: number[];
 *   handle?: SchemaHandle;
 *   next?: number;
 * }} State
 */

/**
 * The part of the NFA a part of the pattern compiles to
 *
 * @typedef {{ start: number; end: number }} Fragment
 */

// Groups are arrays, and they can be nested
/** @type Shape[] */
const ruleShapes = ["schema"];
/** @type Shape */
const shape = { array: ruleShapes };
ruleShapes.push(shape);

/**
 * `itemPattern`. The items have to match a pattern like a regular
 * expression, where each item is matched by a schema. Schemas match in
 * sequence. Arrays group. `"*"`, `"+"`, and `"?"` repeat what's before them,
 * and `"|"` separates alternatives.
 *
 * @type Keyword<{ states: State[]; start: number }>
 */
export default {
  uri: "https://json-schema.org/keyword/itemPattern",
  shape: shape,
  schema: /** @type Json */ (/** @type unknown */ (keywordSchema)),
  async compile(valueNode, context) {
    /** @type State[] */
    const states = [];

    /** @type (end: boolean) => number */
    const addState = (end) => states.push({ end, epsilon: [] }) - 1;

    /** @type (from: number, to: number) => void */
    const addEpsilon = (from, to) => {
      states[from].epsilon.push(to);
    };

    /** @type (fragment: Fragment) => void */
    const unEnd = (fragment) => {
      states[fragment.end].end = false;
    };

    /** @type (patternNode: JsonSchemaNode) => Promise<Fragment> */
    const compilePattern = async (patternNode) => {
      /** @type Fragment[][] */
      const alternatives = [[]];
      let sequence = alternatives[0];

      for (const ruleNode of patternNode.jsonType === "array" ? patternNode.children : []) {
        if (ruleNode.jsonType === "string") {
          const operator = ruleNode.value;
          if (operator === "|") {
            sequence = [];
            alternatives.push(sequence);
            continue;
          }

          const fragment = /** @type Fragment */ (sequence.pop());
          const start = addState(false);
          const end = addState(true);
          unEnd(fragment);
          addEpsilon(start, fragment.start);
          addEpsilon(fragment.end, end);
          if (operator === "*" || operator === "?") {
            addEpsilon(start, end);
          }
          if (operator === "*" || operator === "+") {
            addEpsilon(fragment.end, fragment.start);
          }
          sequence.push({ start, end });
        } else if (ruleNode.jsonType === "array") {
          sequence.push(await compilePattern(ruleNode));
        } else {
          const start = addState(false);
          const end = addState(true);
          states[start].handle = await context.compileSchema(ruleNode);
          states[start].next = end;
          sequence.push({ start, end });
        }
      }

      // An empty sequence matches nothing
      /** @type Fragment[] */
      const fragments = [];
      for (const fragmentSequence of alternatives) {
        if (fragmentSequence.length === 0) {
          const start = addState(false);
          const end = addState(true);
          addEpsilon(start, end);
          fragments.push({ start, end });
          continue;
        }

        let fragment = fragmentSequence[0];
        for (let index = 1; index < fragmentSequence.length; index++) {
          unEnd(fragment);
          addEpsilon(fragment.end, fragmentSequence[index].start);
          fragment = { start: fragment.start, end: fragmentSequence[index].end };
        }
        fragments.push(fragment);
      }

      if (fragments.length === 1) {
        return fragments[0];
      }

      const start = addState(false);
      const end = addState(true);
      for (const fragment of fragments) {
        unEnd(fragment);
        addEpsilon(start, fragment.start);
        addEpsilon(fragment.end, end);
      }

      return { start, end };
    };

    const { start } = await compilePattern(valueNode);
    return { states, start };
  },
  evaluate({ states, start }, { instance, schema }) {
    /** @type (ReturnType<typeof schema> | undefined)[] */
    const evaluators = [];
    for (const state of states) {
      evaluators.push(state.handle === undefined ? undefined : schema(state.handle));
    }

    /**
     * Add the states reachable from a state without consuming an item
     *
     * @type (state: number, reached: Set<number>) => void
     */
    const addReachable = (state, reached) => {
      if (reached.has(state)) {
        return;
      }

      reached.add(state);
      for (const next of states[state].epsilon) {
        addReachable(next, reached);
      }
    };

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      /** @type Set<number> */
      let current = new Set();
      addReachable(start, current);

      let index = 0;
      for (const item of instance.items(node)) {
        /** @type Set<number> */
        const next = new Set();
        for (const state of current) {
          const evaluate = evaluators[state];
          if (evaluate !== undefined && evaluate(item, index)) {
            addReachable(/** @type number */ (states[state].next), next);
          }
        }

        current = next;
        if (current.size === 0) {
          return false;
        }
        index++;
      }

      for (const state of current) {
        if (states[state].end) {
          return true;
        }
      }

      return false;
    };
  }
};
