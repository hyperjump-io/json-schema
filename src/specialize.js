import * as JsonPointer from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { keywordDefinitionUri } from "./compile.js";

/**
 * @import { Data, Node } from "unist"
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { EvaluateContext, Evaluator, InstanceOps } from "./keyword.d.ts"
 * @import { EvaluationLocation, EvaluationPlugin, KeywordInfo, SchemaInfo } from "./evaluation-plugin.d.ts"
 * @import { CompiledSchemas } from "./compile.js"
 */

/**
 * @template I
 * @typedef {(instance: I, segment?: string | number) => boolean} SchemaEvaluator
 */

/**
 * @template I
 * @typedef {{
 *   info: KeywordInfo;
 *   step: string;
 *   evaluate: Evaluator<I>;
 * }} SpecializedKeyword
 */

/**
 * Annotations are collected in nested lists so a passing schema can add its
 * subschemas' annotations to its own without copying them. They're flattened
 * when they're attached to the instance.
 *
 * @typedef {{ node: Node; keywordUri: string; value: Json }} Annotation
 * @typedef {(Annotation | AnnotationList)[]} AnnotationList
 */

/**
 * @template I
 * @typedef {{
 *   instance: InstanceOps<I>;
 *   isAst: boolean;
 *   annotating: boolean;
 *   instrumented: boolean;
 * }} SpecializeOptions
 */

/**
 * @template I
 * @typedef {(instance: I, plugins?: EvaluationPlugin[]) => boolean} Specialization
 */

/** @type ReadonlySet<string | number> */
const nothingEvaluated = new Set();

/** @type Readonly<Record<string, string>> */
const noDynamicAnchors = {};

/**
 * Turn compiled schemas into an evaluation function for one kind of instance
 * and one mode. Evaluation keeps its state in this closure rather than
 * passing it through every call. An evaluation that starts while another one
 * is in progress saves the outer one's state and restores it when it's done.
 *
 * - `isAst`: The instance is a JSON AST. Values that couldn't be parsed
 *   aren't evaluated.
 * - `annotating`: Collect annotations and attach them to the instance's
 *   nodes. Only for ASTs.
 * - `instrumented`: Run plugins. Instance and keyword locations are only
 *   tracked for plugins.
 *
 * @type <I>(jsonSchema: JsonSchema, compiled: CompiledSchemas, options: SpecializeOptions<I>) => Specialization<I>
 */
export const specialize = (jsonSchema, compiled, options) => {
  const { instance: ops, isAst, annotating, instrumented } = options;

  // Errors and annotations are collected from every subschema
  const exhaustive = annotating || instrumented;

  // Only the state some keyword reads is tracked
  let tracksEvaluated = false;
  let tracksDynamicScope = false;
  for (const handle in compiled.schemas) {
    const schema = compiled.schemas[handle];
    if (typeof schema === "boolean") {
      continue;
    }

    for (const [keywordUri] of schema.keywords) {
      const reads = jsonSchema.getKeyword(keywordDefinitionUri(keywordUri)).reads;
      tracksEvaluated ||= reads?.includes("evaluated") ?? false;
      tracksDynamicScope ||= reads?.includes("dynamicScope") ?? false;
    }
  }

  const isSimple = !exhaustive && !tracksEvaluated && !tracksDynamicScope;

  // Evaluation state. Schema evaluators save what they change and restore it
  // before they return.

  /** @type unknown */
  let currentInstance;

  // Properties and items evaluated by the keyword being evaluated and by the
  // schema it's in
  /** @type Set<string | number> | undefined */
  let keywordMarks;
  /** @type Set<string | number> | undefined */
  let schemaMarks;

  // Annotations from the keyword being evaluated and the schema it's in
  /** @type AnnotationList | undefined */
  let keywordAnnotations;
  /** @type AnnotationList | undefined */
  let schemaAnnotations;

  /** @type string | undefined */
  let currentResource;
  /** @type Record<string, string> | undefined */
  let dynamicAnchors;

  let instanceLocation = "";
  let keywordLocation = "";

  /** @type EvaluationPlugin[] */
  let plugins = [];
  /** @type unknown[] | undefined */
  let keywordStates;

  /** @typedef {Parameters<typeof ops.typeOf>[0]} I */

  /** @type Record<string, SchemaEvaluator<I>> */
  const evaluators = {};

  /** @type (handle: string) => SchemaEvaluator<I> */
  const evaluatorFor = (handle) => {
    if (!(handle in evaluators)) {
      if (!(handle in compiled.schemas)) {
        throw Error(`The '${handle}' schema wasn't compiled`);
      }

      // Schemas that refer to each other get this until it's built
      /** @type SchemaEvaluator<I> */
      let evaluator = () => {
        throw Error(`The '${handle}' schema was evaluated before it was specialized`);
      };
      evaluators[handle] = (instance, segment) => evaluator(instance, segment);
      evaluator = buildSchema(handle);
      evaluators[handle] = evaluator;
    }

    return evaluators[handle];
  };

  /**
   * The evaluator for a subschema of a keyword. When locations are tracked,
   * the keyword location is the schema's plus the path from the schema to
   * the subschema. That's usually in the keyword's value, but it can be in a
   * sibling's, like `then` for `if`. A subschema that isn't in the schema,
   * like the target of a reference, keeps the keyword's location. Steps
   * taken from canonical URIs are percent-encoded, but keyword locations are
   * JSON Pointers, so they're decoded.
   *
   * @type (handle: string, schemaHandle: string, keywordAbsoluteLocation: string, steps: Record<string, string> | undefined) => SchemaEvaluator<I>
   */
  const subschemaEvaluator = (handle, schemaHandle, keywordAbsoluteLocation, steps) => {
    const evaluator = evaluatorFor(handle);
    if (!instrumented) {
      return evaluator;
    }

    const step = steps?.[handle]
      ?? (handle.startsWith(`${keywordAbsoluteLocation}/`) ? decodeURIComponent(handle.slice(schemaHandle.length)) : undefined);
    if (step === undefined) {
      return evaluator;
    }

    const keywordStep = decodeURIComponent(keywordAbsoluteLocation.slice(schemaHandle.length));
    return (instance, segment) => {
      const outerKeywordLocation = keywordLocation;
      keywordLocation = keywordLocation.slice(0, keywordLocation.length - keywordStep.length) + step;
      const valid = evaluator(instance, segment);
      keywordLocation = outerKeywordLocation;
      return valid;
    };
  };

  /** @type (instance: I) => EvaluationLocation */
  const location = (instance) => ({
    instanceLocation: instanceLocation,
    keywordLocation: keywordLocation,
    node: isAst ? /** @type EvaluationLocation["node"] */ (instance) : undefined,
    value: () => ops.typeOf(instance) === undefined ? undefined : ops.value(instance)
  });

  /** @type (handle: string, keywordUri: string, location: string, compiledValue: Json, steps: Record<string, string> | undefined) => SpecializedKeyword<I> | undefined */
  const buildKeyword = (handle, keywordUri, location, compiledValue, steps) => {
    const keyword = jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
    if (!keyword.evaluate) {
      return;
    }

    /** @type Map<string, SchemaEvaluator<I>> */
    const dynamicEvaluators = new Map();

    /** @type EvaluateContext<I> */
    const context = {
      jsonSchema: jsonSchema,
      instance: ops,
      schema: (subschemaHandle) => subschemaEvaluator(subschemaHandle, handle, location, steps),
      exhaustive: exhaustive
    };

    if (annotating) {
      context.annotate = (value) => {
        keywordAnnotations ??= [];
        keywordAnnotations.push({ node: /** @type Node */ (currentInstance), keywordUri, value });
      };
    }

    if (tracksEvaluated) {
      context.markEvaluated = (key) => {
        keywordMarks ??= new Set();
        keywordMarks.add(key);
      };

      if (keyword.reads?.includes("evaluated")) {
        context.evaluated = () => schemaMarks ?? nothingEvaluated;
      }
    }

    if (keyword.reads?.includes("dynamicScope")) {
      context.dynamicAnchor = (name) => {
        const anchorHandle = dynamicAnchors?.[name];
        if (anchorHandle === undefined) {
          return;
        }

        let evaluator = dynamicEvaluators.get(anchorHandle);
        if (evaluator === undefined) {
          evaluator = subschemaEvaluator(anchorHandle, handle, location, steps);
          dynamicEvaluators.set(anchorHandle, evaluator);
        }
        return evaluator;
      };

      context.resourceDynamicAnchors = (resourceUri) => compiled.resources[resourceUri]?.dynamicAnchors ?? noDynamicAnchors;
    }

    return {
      info: { keywordUri, absoluteKeywordLocation: location, keyword, compiled: compiledValue },
      step: decodeURIComponent(location.slice(handle.length)),
      evaluate: keyword.evaluate(compiledValue, context)
    };
  };

  /** @type (handle: string) => SchemaEvaluator<I> */
  const buildSchema = (handle) => {
    const schema = compiled.schemas[handle];

    /** @type SpecializedKeyword<I>[] */
    const keywords = [];
    if (typeof schema !== "boolean") {
      for (const [keywordUri, location, compiledValue, steps] of schema.keywords) {
        const keyword = buildKeyword(handle, keywordUri, location, compiledValue, steps);
        if (keyword) {
          keywords.push(keyword);
        }
      }
    }

    if (isSimple) {
      return simpleSchemaEvaluator(schema, keywords.map((keyword) => keyword.evaluate));
    }

    /** @type SchemaInfo */
    const info = { absoluteKeywordLocation: handle };
    if (typeof schema === "boolean") {
      info.booleanSchema = schema;
    }
    const resource = typeof schema === "boolean" ? toAbsoluteIri(handle) : schema.resource;

    return (instance, segment) => {
      if (isAst && ops.typeOf(instance) === undefined) {
        return true;
      }

      const outerInstance = currentInstance;
      currentInstance = instance;

      const outerInstanceLocation = instanceLocation;
      if (instrumented && segment !== undefined) {
        instanceLocation = JsonPointer.append(`${segment}`, instanceLocation);
      }

      const outerResource = currentResource;
      const outerDynamicAnchors = dynamicAnchors;
      if (tracksDynamicScope && resource !== currentResource) {
        currentResource = resource;
        dynamicAnchors = addDynamicAnchors(compiled.resources[resource].dynamicAnchors, dynamicAnchors);
      }

      const outerKeywordMarks = keywordMarks;
      const outerSchemaMarks = schemaMarks;
      schemaMarks = undefined;

      const outerKeywordAnnotations = keywordAnnotations;
      const outerSchemaAnnotations = schemaAnnotations;
      schemaAnnotations = undefined;

      const parentStates = keywordStates;
      const schemaKeywordLocation = keywordLocation;

      /** @type EvaluationLocation | undefined */
      let schemaAt;
      /** @type unknown[] */
      const schemaStates = [];
      if (instrumented) {
        schemaAt = location(instance);
        for (let index = 0; index < plugins.length; index++) {
          schemaStates[index] = plugins[index].beforeSchema?.(info, schemaAt, parentStates?.[index]);
        }
      }

      let valid = typeof schema === "boolean" ? schema : true;
      for (const keyword of keywords) {
        keywordMarks = undefined;
        keywordAnnotations = undefined;

        /** @type EvaluationLocation | undefined */
        let keywordAt;
        /** @type unknown[] */
        const states = [];
        if (instrumented) {
          keywordLocation = schemaKeywordLocation + keyword.step;
          keywordAt = location(instance);
          for (let index = 0; index < plugins.length; index++) {
            states[index] = plugins[index].beforeKeyword?.(keyword.info, keywordAt, schemaStates[index]);
          }
          keywordStates = states;
        }

        const isKeywordValid = keyword.evaluate(instance);

        if (instrumented) {
          for (let index = 0; index < plugins.length; index++) {
            plugins[index].afterKeyword?.(keyword.info, /** @type EvaluationLocation */ (keywordAt), isKeywordValid, states[index], schemaStates[index]);
          }
          keywordStates = parentStates;
          keywordLocation = schemaKeywordLocation;
        }

        // A keyword's marks and annotations are only kept if it passes
        if (isKeywordValid) {
          schemaMarks = union(schemaMarks, keywordMarks);
          if (keywordAnnotations !== undefined) {
            schemaAnnotations ??= [];
            schemaAnnotations.push(keywordAnnotations);
          }
        } else {
          valid = false;
          if (!exhaustive) {
            break;
          }
        }
      }

      const marks = schemaMarks;
      const annotations = schemaAnnotations;
      keywordMarks = outerKeywordMarks;
      schemaMarks = outerSchemaMarks;
      keywordAnnotations = outerKeywordAnnotations;
      schemaAnnotations = outerSchemaAnnotations;

      // A schema's marks and annotations are only kept if it passes. Marks
      // are about the instance they were made for, so they don't count for
      // the parent of a property or item.
      if (valid) {
        if (segment === undefined) {
          keywordMarks = union(keywordMarks, marks);
        }
        if (annotations !== undefined) {
          keywordAnnotations ??= [];
          keywordAnnotations.push(annotations);
        }
      }

      if (instrumented) {
        for (let index = 0; index < plugins.length; index++) {
          plugins[index].afterSchema?.(info, /** @type EvaluationLocation */ (schemaAt), valid, schemaStates[index], parentStates?.[index]);
        }
      }

      currentInstance = outerInstance;
      instanceLocation = outerInstanceLocation;
      currentResource = outerResource;
      dynamicAnchors = outerDynamicAnchors;

      return valid;
    };
  };

  /**
   * The fastest evaluator, for when nothing but the result is needed
   *
   * @type (schema: CompiledSchemas["schemas"][string], keywords: Evaluator<I>[]) => SchemaEvaluator<I>
   */
  const simpleSchemaEvaluator = (schema, keywords) => {
    if (typeof schema === "boolean") {
      return isAst
        ? (instance) => schema || ops.typeOf(instance) === undefined
        : () => schema;
    }

    if (isAst) {
      return (instance) => {
        if (ops.typeOf(instance) === undefined) {
          return true;
        }

        for (const evaluate of keywords) {
          if (!evaluate(instance)) {
            return false;
          }
        }

        return true;
      };
    }

    // Plain values are always parsed, so a schema with one keyword is that
    // keyword
    if (keywords.length === 0) {
      return () => true;
    } else if (keywords.length === 1) {
      return keywords[0];
    }

    return (instance) => {
      for (let index = 0; index < keywords.length; index++) {
        if (!keywords[index](instance)) {
          return false;
        }
      }

      return true;
    };
  };

  const root = evaluatorFor(compiled.uri);

  // The simplest evaluators don't use any evaluation state
  if (isSimple) {
    return (instance) => root(instance);
  }

  return (instance, callPlugins = []) => {
    // A plugin or keyword can start another evaluation with this
    // specialization while one is in progress, so the outer evaluation's
    // state is restored when this one is done.
    const outerPlugins = plugins;
    const outerInstance = currentInstance;
    const outerKeywordMarks = keywordMarks;
    const outerSchemaMarks = schemaMarks;
    const outerKeywordAnnotations = keywordAnnotations;
    const outerSchemaAnnotations = schemaAnnotations;
    const outerResource = currentResource;
    const outerDynamicAnchors = dynamicAnchors;
    const outerInstanceLocation = instanceLocation;
    const outerKeywordLocation = keywordLocation;
    const outerKeywordStates = keywordStates;

    plugins = callPlugins;
    currentInstance = undefined;
    keywordMarks = undefined;
    schemaMarks = undefined;
    keywordAnnotations = undefined;
    schemaAnnotations = undefined;
    currentResource = undefined;
    dynamicAnchors = undefined;
    instanceLocation = "";
    keywordLocation = "";
    keywordStates = undefined;

    try {
      const valid = root(instance);
      if (valid && keywordAnnotations !== undefined) {
        attachAnnotations(keywordAnnotations);
      }

      return valid;
    } finally {
      plugins = outerPlugins;
      currentInstance = outerInstance;
      keywordMarks = outerKeywordMarks;
      schemaMarks = outerSchemaMarks;
      keywordAnnotations = outerKeywordAnnotations;
      schemaAnnotations = outerSchemaAnnotations;
      currentResource = outerResource;
      dynamicAnchors = outerDynamicAnchors;
      instanceLocation = outerInstanceLocation;
      keywordLocation = outerKeywordLocation;
      keywordStates = outerKeywordStates;
    }
  };
};

/**
 * Add a resource's dynamic anchors to the dynamic scope. The outermost
 * schema with an anchor wins, so anchors that are already in scope aren't
 * replaced. The outer scope is reused if the resource doesn't add anything.
 *
 * @type (resourceAnchors: Record<string, string>, dynamicAnchors: Record<string, string> | undefined) => Record<string, string>
 */
const addDynamicAnchors = (resourceAnchors, dynamicAnchors) => {
  if (dynamicAnchors === undefined) {
    return resourceAnchors;
  }

  for (const name in resourceAnchors) {
    if (!Object.hasOwn(dynamicAnchors, name)) {
      return { ...resourceAnchors, ...dynamicAnchors };
    }
  }

  return dynamicAnchors;
};

/** @type (a: Set<string | number> | undefined, b: Set<string | number> | undefined) => Set<string | number> | undefined */
const union = (a, b) => {
  if (a === undefined) {
    return b;
  } else if (b !== undefined) {
    for (const key of b) {
      a.add(key);
    }
  }

  return a;
};

/** @type (annotations: AnnotationList) => void */
const attachAnnotations = (annotations) => {
  for (const annotation of annotations) {
    if (Array.isArray(annotation)) {
      attachAnnotations(annotation);
    } else {
      /** @type Data */
      const data = annotation.node.data ??= {};
      data.annotations ??= new Map();
      let values = data.annotations.get(annotation.keywordUri);
      if (values === undefined) {
        values = [];
        data.annotations.set(annotation.keywordUri, values);
      }
      values.push(annotation.value);
    }
  }
};
