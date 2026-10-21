import { fromJs, fromJson } from "@hyperjump/browser/json";
import { astInstance, jsInstance } from "./instance.js";
import { optimize } from "./optimize.js";
import { specialize } from "./specialize.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import * as API from "../json-schema.d.ts"
 * @import { JsonSyntaxError, OutputFormat, ValidationResult } from "../output/output-format.d.ts"
 * @import { EvaluationPlugin } from "./evaluation-plugin.d.ts"
 * @import { CompiledSchemas } from "./compile.js"
 * @import { Specialization } from "./specialize.js"
 * @import { InstanceNode } from "./instance.js"
 */

// Shared by every evaluation of an instance that wasn't parsed from JSON text
/** @type JsonSyntaxError[] */
const noSyntaxErrors = /** @type JsonSyntaxError[] */ (/** @type unknown */ (Object.freeze([])));

/** @implements API.Validator */
export class Validator {
  /** @type API.JsonSchema */
  #jsonSchema;

  /** @type CompiledSchemas */
  #compiled;

  /**
   * The IR with the `fastOnly` optimizations too, for the specializations
   * without plugins or annotations. It's built the first time it's needed.
   *
   * @type CompiledSchemas | undefined
   */
  #fastCompiled;

  /**
   * Specializations are built the first time they're needed
   *
   * @type Record<string, Specialization<Json>>
   */
  #jsSpecializations;

  /** @type Record<string, Specialization<InstanceNode>> */
  #astSpecializations;

  /**
   * The specialization for `validate` without output or plugins. It's the
   * most common call, so it doesn't go through `#evaluate`.
   *
   * @type Specialization<Json> | undefined
   */
  #jsFlag;

  /**
   * @param {API.JsonSchema} jsonSchema
   * @param {CompiledSchemas} compiled
   */
  constructor(jsonSchema, compiled) {
    this.#jsonSchema = jsonSchema;
    this.#compiled = compiled;
    this.#jsSpecializations = {};
    this.#astSpecializations = {};
  }

  get uri() {
    return this.#compiled.uri;
  }

  /** @type API.Validator["validate"] */
  validate(instance, options) {
    if (options === undefined) {
      this.#jsFlag ??= this.#jsSpecialization(false);
      return /** @type ValidationResult<any> */ (this.#jsFlag(instance));
    }

    return this.#evaluate((annotating, instrumented) => {
      if (annotating) {
        throw Error("Annotating needs an AST");
      }

      return this.#jsSpecialization(instrumented);
    }, instance, false, options, noSyntaxErrors);
  }

  /** @type (instrumented: boolean) => Specialization<Json> */
  #jsSpecialization(instrumented) {
    const key = `${instrumented}`;
    this.#jsSpecializations[key] ??= specialize(this.#jsonSchema, this.#compiledFor(false, instrumented), {
      instance: jsInstance,
      isAst: false,
      annotating: false,
      instrumented: instrumented
    });
    return this.#jsSpecializations[key];
  }

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
    return structuredClone(this.#compiled);
  }

  /**
   * @template {OutputFormat} F
   * @param {InstanceNode} node
   * @param {boolean} annotating
   * @param {API.ValidationOptions<F> | undefined} options
   * @param {JsonSyntaxError[]} syntaxErrors
   * @returns {ValidationResult<F>}
   */
  #evaluateAst(node, annotating, options, syntaxErrors) {
    return this.#evaluate((annotating, instrumented) => this.#astSpecialization(annotating, instrumented), node, annotating, options, syntaxErrors);
  }

  /** @type (annotating: boolean, instrumented: boolean) => Specialization<InstanceNode> */
  #astSpecialization(annotating, instrumented) {
    const key = `${annotating}-${instrumented}`;
    this.#astSpecializations[key] ??= specialize(this.#jsonSchema, this.#compiledFor(annotating, instrumented), {
      instance: astInstance,
      isAst: true,
      annotating: annotating,
      instrumented: instrumented
    });
    return this.#astSpecializations[key];
  }

  /** @type (annotating: boolean, instrumented: boolean) => CompiledSchemas */
  #compiledFor(annotating, instrumented) {
    if (annotating || instrumented) {
      return this.#compiled;
    }

    this.#fastCompiled ??= optimize(this.#compiled, true);
    return this.#fastCompiled;
  }

  /**
   * Evaluate without plugins if possible, because that's fastest. The output
   * format's plugin only runs if the instance turns out to be invalid,
   * unless there are other plugins. Then everything runs in one evaluation
   * so no plugin sees the instance twice.
   *
   * @template I
   * @template {OutputFormat} F
   * @param {(annotating: boolean, instrumented: boolean) => Specialization<I>} specializationFor
   * @param {I} instance
   * @param {boolean} annotating
   * @param {API.ValidationOptions<F> | undefined} options
   * @param {JsonSyntaxError[]} syntaxErrors
   * @returns {ValidationResult<F>}
   */
  #evaluate(specializationFor, instance, annotating, options, syntaxErrors) {
    const format = options?.output ?? "FLAG";
    const plugins = options?.plugins ?? [];
    const isParsed = syntaxErrors.length === 0;

    if (format === "FLAG") {
      const valid = plugins.length === 0
        ? specializationFor(annotating, false)(instance)
        : specializationFor(annotating, true)(instance, plugins);
      return /** @type ValidationResult<F> */ (valid && isParsed);
    }

    const { plugin, output } = this.#jsonSchema.getOutputFormat(format)();

    let valid;
    if (plugins.length === 0) {
      valid = specializationFor(annotating, false)(instance);
      if (!valid && plugin) {
        specializationFor(false, true)(instance, [plugin]);
      }
    } else {
      /** @type EvaluationPlugin[] */
      const allPlugins = plugin ? [...plugins, plugin] : plugins;
      valid = specializationFor(annotating, true)(instance, allPlugins);
    }

    return output(valid && isParsed, syntaxErrors);
  }
}
