import { fromJs, fromJson } from "@hyperjump/browser/json";
import { withRelativeFileUris } from "./kernel-uris.js";
import { astInstance, jsInstance } from "./instance.js";
import { optimize } from "./optimize.js";
import { fast } from "./fast.js";
import { instrumented } from "./instrumented.js";
import { FLAG } from "../output/flag.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import * as API from "./validator.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { EvaluationOptions } from "../operations/validate.d.ts"
 * @import { JsonSyntaxError, OutputFormat } from "../output/output-format.d.ts"
 * @import { EvaluationPlugin } from "./evaluation-plugin.d.ts"
 * @import { InstanceOps } from "../keyword.d.ts"
 * @import { Kernel } from "./kernel.d.ts"
 * @import { Instrumented } from "./instrumented.js"
 * @import { InstanceNode } from "./instance.js"
 */

/**
 * @template I
 * @typedef {(instance: I, plugins?: EvaluationPlugin[]) => boolean} Evaluate
 */

// Shared by every evaluation of an instance that wasn't parsed from JSON text
/** @type JsonSyntaxError[] */
const noSyntaxErrors = /** @type JsonSyntaxError[] */ (/** @type unknown */ (Object.freeze([])));

/** @implements API.Validator */
export class Validator {
  /** @type JsonSchema */
  #jsonSchema;

  /** @type Kernel */
  #kernel;

  /**
   * Evaluators are built the first time they're needed, each from the kernel
   * optimized for what it can observe. They're indexed by mode (see
   * {@link modeIndex}) because they're looked up on every evaluation.
   *
   * @type (Evaluate<Json> | undefined)[]
   */
  #jsEvaluators;

  /** @type (Evaluate<InstanceNode> | undefined)[] */
  #astEvaluators;

  /**
   * The evaluator for `validate` without output or plugins. It's the most
   * common call, so it doesn't go through `#evaluate`.
   *
   * @type ((instance: Json) => boolean) | undefined
   */
  #jsFlag;

  /**
   * @param {JsonSchema} jsonSchema
   * @param {Kernel} kernel
   */
  constructor(jsonSchema, kernel) {
    this.#jsonSchema = jsonSchema;
    this.#kernel = kernel;
    this.#jsEvaluators = [];
    this.#astEvaluators = [];
  }

  get uri() {
    return this.#kernel.uri;
  }

  /** @type API.Validator["validate"] */
  validate(readonlyInstance, options) {
    // Evaluating only reads the instance
    const instance = /** @type Json */ (readonlyInstance);
    if (options === undefined) {
      this.#jsFlag ??= fast(this.#jsonSchema, optimize(this.#kernel, { fast: true, plugins: false, annotations: false }));
      return /** @type any */ (this.#jsFlag(instance));
    }

    return this.#evaluate(this.#jsEvaluator, instance, false, options, noSyntaxErrors);
  }

  /** @type (annotating: boolean, plugins: EvaluationPlugin[]) => Evaluate<Json> */
  #jsEvaluator = (annotating, plugins) => {
    if (annotating) {
      throw Error("Annotating needs an AST");
    } else if (plugins.length === 0) {
      this.#jsFlag ??= fast(this.#jsonSchema, optimize(this.#kernel, { fast: true, plugins: false, annotations: false }));
      return this.#jsFlag;
    }

    const index = modeIndex(false, plugins);
    this.#jsEvaluators[index] ??= this.#instrumented(jsInstance, false, false, plugins);
    return this.#jsEvaluators[index];
  };

  /** @type API.Validator["validateJson"] */
  validateJson(json, options) {
    const result = fromJson(json);
    return this.#evaluateAst(result.node, false, options, result.errors);
  }

  /** @type API.Validator["validateNode"] */
  validateNode(node, options) {
    return this.#evaluateAst(/** @type InstanceNode */ (node), false, options, noSyntaxErrors);
  }

  /** @type API.Validator["annotate"] */
  annotate(instance, options) {
    const node = fromJs(instance);
    const output = this.#evaluateAst(node, true, options, noSyntaxErrors);
    return { output, status: "success", node };
  }

  /** @type API.Validator["annotateJson"] */
  annotateJson(json, options) {
    const result = fromJson(json);
    const output = this.#evaluateAst(result.node, true, options, result.errors);
    return { output, status: result.status, node: result.node };
  }

  /** @type API.Validator["annotateNode"] */
  annotateNode(node, options) {
    return this.#evaluateAst(/** @type InstanceNode */ (node), true, options, noSyntaxErrors);
  }

  /** @type API.Validator["serialize"] */
  serialize() {
    return structuredClone(withRelativeFileUris(this.#kernel));
  }

  /**
   * @template R
   * @param {InstanceNode} node
   * @param {boolean} annotating
   * @param {EvaluationOptions<R> | undefined} options
   * @param {JsonSyntaxError[]} syntaxErrors
   * @returns {R}
   */
  #evaluateAst(node, annotating, options, syntaxErrors) {
    return this.#evaluate(this.#astEvaluator, node, annotating, options, syntaxErrors);
  }

  /** @type (annotating: boolean, plugins: EvaluationPlugin[]) => Evaluate<InstanceNode> */
  #astEvaluator = (annotating, plugins) => {
    const index = modeIndex(annotating, plugins);
    this.#astEvaluators[index] ??= this.#instrumented(astInstance, true, annotating, plugins);
    return this.#astEvaluators[index];
  };

  /**
   * An evaluator for plugins, annotating, or ASTs, from the kernel optimized
   * for what the plugins can see
   *
   * @type <I>(ops: InstanceOps<I>, isAst: boolean, annotating: boolean, plugins: EvaluationPlugin[]) => Instrumented<I>
   */
  #instrumented(ops, isAst, annotating, plugins) {
    const annotations = annotating || plugins.some((plugin) => plugin.annotation !== undefined);
    const kernel = optimize(this.#kernel, { fast: !annotating && plugins.length === 0, plugins: plugins.length > 0, annotations });
    return instrumented(this.#jsonSchema, kernel, { instance: ops, isAst, annotating, instrumented: plugins.length > 0 });
  }

  /**
   * Evaluate without plugins if possible, because that's fastest. The output
   * format's plugin only runs if the instance turns out to be invalid,
   * unless there are other plugins. Then everything runs in one evaluation
   * so no plugin sees the instance twice.
   *
   * @template I
   * @template R
   * @param {(annotating: boolean, plugins: EvaluationPlugin[]) => Evaluate<I>} evaluatorFor
   * @param {I} instance
   * @param {boolean} annotating
   * @param {EvaluationOptions<R> | undefined} options
   * @param {JsonSyntaxError[]} syntaxErrors
   * @returns {R}
   */
  #evaluate(evaluatorFor, instance, annotating, options, syntaxErrors) {
    const format = /** @type OutputFormat<R> */ (options?.output ?? FLAG);
    const plugins = options?.plugins ?? [];
    const isParsed = syntaxErrors.length === 0;

    // FLAG doesn't need anything from its format, so it isn't called
    if (format === FLAG) {
      const valid = evaluatorFor(annotating, plugins)(instance, plugins);
      return /** @type R */ (valid && isParsed);
    }

    const { plugin, output } = format();

    let valid;
    if (plugins.length === 0) {
      valid = evaluatorFor(annotating, plugins)(instance);
      if (!valid && plugin) {
        evaluatorFor(false, [plugin])(instance, [plugin]);
      }
    } else {
      /** @type EvaluationPlugin[] */
      const allPlugins = plugin ? [...plugins, plugin] : plugins;
      valid = evaluatorFor(annotating, allPlugins)(instance, allPlugins);
    }

    return output(valid && isParsed, syntaxErrors);
  }
}

/**
 * Evaluators depend on whether there are plugins and whether one has an
 * `annotation` hook, not on which plugins they are. Plugins are often
 * created for each call, so a cache keyed by plugin would miss every time.
 *
 * @type (annotating: boolean, plugins: EvaluationPlugin[]) => number
 */
const modeIndex = (annotating, plugins) => {
  const instrumented = plugins.length > 0;
  const annotationHook = instrumented && plugins.some((plugin) => plugin.annotation !== undefined);
  return (annotating ? 4 : 0) + (instrumented ? 2 : 0) + (annotationHook ? 1 : 0);
};
