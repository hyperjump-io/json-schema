import { fromJs, fromJson } from "@hyperjump/browser";
import { withRelativeFileUris } from "./kernel-uris.js";
import { astInstance, jsInstance } from "./instance.js";
import { optimize } from "./optimize.js";
import { fast } from "./fast.js";
import { FLAG } from "../output/flag.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import * as API from "./validator.d.ts"
 * @import { Definitions } from "./definitions.js"
 * @import { EvaluationOptions } from "../operations/validate.d.ts"
 * @import { JsonSyntaxError, OutputFormat } from "../output/output-format.d.ts"
 * @import { EvaluationPlugin } from "./evaluation-plugin.d.ts"
 * @import { InstanceOps } from "../keyword.d.ts"
 * @import { Kernel } from "./kernel.d.ts"
 * @import { Instrumented, instrumented } from "./instrumented.js"
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
  /** @type Definitions */
  #definitions;

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
   * @param {Definitions} definitions
   * @param {Kernel} kernel
   */
  constructor(definitions, kernel) {
    this.#definitions = definitions;
    this.#kernel = kernel;
    this.#jsEvaluators = [];
    this.#astEvaluators = [];
  }

  get uri() {
    return this.#kernel.uri;
  }

  /** @type API.Validator["validate"] */
  validate(readonlyInstance, options, evaluator) {
    // Evaluating only reads the instance
    const instance = /** @type Json */ (readonlyInstance);
    if (options === undefined) {
      this.#jsFlag ??= fast(this.#definitions, optimize(this.#kernel, { fast: true, plugins: false, annotations: false }));
      return /** @type any */ (this.#jsFlag(instance));
    }

    return this.#evaluate(this.#jsEvaluator, instance, false, options, noSyntaxErrors, evaluator);
  }

  /** @type (annotating: boolean, plugins: EvaluationPlugin[], evaluator: typeof instrumented | undefined) => Evaluate<Json> */
  #jsEvaluator = (annotating, plugins, evaluator) => {
    if (annotating) {
      throw Error("Annotating needs an AST");
    } else if (plugins.length === 0) {
      this.#jsFlag ??= fast(this.#definitions, optimize(this.#kernel, { fast: true, plugins: false, annotations: false }));
      return this.#jsFlag;
    }

    const index = modeIndex(false, plugins);
    this.#jsEvaluators[index] ??= this.#instrumented(evaluator, jsInstance, false, false, plugins);
    return this.#jsEvaluators[index];
  };

  /** @type API.Validator["validateJson"] */
  validateJson(json, options, evaluator) {
    const result = fromJson(json);
    return this.#evaluateAst(result.node, false, options, result.errors, evaluator);
  }

  /** @type API.Validator["validateNode"] */
  validateNode(node, options, evaluator) {
    return this.#evaluateAst(/** @type InstanceNode */ (node), false, options, noSyntaxErrors, evaluator);
  }

  /** @type API.Validator["annotate"] */
  annotate(instance, options, evaluator) {
    const node = fromJs(instance);
    const output = this.#evaluateAst(node, true, options, noSyntaxErrors, evaluator);
    return { output, status: "success", node };
  }

  /** @type API.Validator["annotateJson"] */
  annotateJson(json, options, evaluator) {
    const result = fromJson(json);
    const output = this.#evaluateAst(result.node, true, options, result.errors, evaluator);
    return { output, status: result.status, node: result.node };
  }

  /** @type API.Validator["annotateNode"] */
  annotateNode(node, options, evaluator) {
    return this.#evaluateAst(/** @type InstanceNode */ (node), true, options, noSyntaxErrors, evaluator);
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
   * @param {typeof instrumented | undefined} evaluator
   * @returns {R}
   */
  #evaluateAst(node, annotating, options, syntaxErrors, evaluator) {
    return this.#evaluate(this.#astEvaluator, node, annotating, options, syntaxErrors, evaluator);
  }

  /** @type (annotating: boolean, plugins: EvaluationPlugin[], evaluator: typeof instrumented | undefined) => Evaluate<InstanceNode> */
  #astEvaluator = (annotating, plugins, evaluator) => {
    const index = modeIndex(annotating, plugins);
    this.#astEvaluators[index] ??= this.#instrumented(evaluator, astInstance, true, annotating, plugins);
    return this.#astEvaluators[index];
  };

  /**
   * An evaluator for plugins, annotating, or ASTs, from the kernel optimized
   * for what the plugins can see
   *
   * @type <I>(evaluator: typeof instrumented | undefined, ops: InstanceOps<I>, isAst: boolean, annotating: boolean, plugins: EvaluationPlugin[]) => Instrumented<I>
   */
  #instrumented(evaluator, ops, isAst, annotating, plugins) {
    if (evaluator === undefined) {
      throw Error("Evaluating with output, plugins, annotations, or an AST needs the instrumented evaluator");
    }
    const annotations = annotating || plugins.some((plugin) => plugin.annotation !== undefined);
    const kernel = optimize(this.#kernel, { fast: !annotating && plugins.length === 0, plugins: plugins.length > 0, annotations });
    return evaluator(this.#definitions, kernel, { instance: ops, isAst, annotating, instrumented: plugins.length > 0 });
  }

  /**
   * Evaluate without plugins if possible, because that's fastest. The output
   * format's plugin only runs if the instance turns out to be invalid,
   * unless there are other plugins. Then everything runs in one evaluation
   * so no plugin sees the instance twice.
   *
   * @template I
   * @template R
   * @param {(annotating: boolean, plugins: EvaluationPlugin[], evaluator: typeof instrumented | undefined) => Evaluate<I>} evaluatorFor
   * @param {I} instance
   * @param {boolean} annotating
   * @param {EvaluationOptions<R> | undefined} options
   * @param {JsonSyntaxError[]} syntaxErrors
   * @param {typeof instrumented | undefined} evaluator
   * @returns {R}
   */
  #evaluate(evaluatorFor, instance, annotating, options, syntaxErrors, evaluator) {
    const format = /** @type OutputFormat<R> */ (options?.output ?? FLAG);
    const plugins = options?.plugins ?? [];
    const isParsed = syntaxErrors.length === 0;

    // FLAG doesn't need anything from its format, so it isn't called
    if (format === FLAG) {
      const valid = evaluatorFor(annotating, plugins, evaluator)(instance, plugins);
      return /** @type R */ (valid && isParsed);
    }

    const { plugin, output } = format();

    let valid;
    if (plugins.length === 0) {
      valid = evaluatorFor(annotating, plugins, evaluator)(instance);
      if (!valid && plugin) {
        evaluatorFor(false, [plugin], evaluator)(instance, [plugin]);
      }
    } else {
      /** @type EvaluationPlugin[] */
      const allPlugins = plugin ? [...plugins, plugin] : plugins;
      valid = evaluatorFor(annotating, allPlugins, evaluator)(instance, allPlugins);
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
