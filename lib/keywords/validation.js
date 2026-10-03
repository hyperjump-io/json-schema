import { value, entries } from "@hyperjump/browser";
import { append as pointerAppend } from "@hyperjump/json-pointer";
import { publishAsync } from "../pubsub.js";
import { canonicalUri, getKeyword, getKeywordByName } from "../experimental.js";


const id = "https://json-schema.org/evaluation/validate";

const compile = async (schema, ast) => {
  // Meta validation
  await publishAsync("validate.metaValidate", schema);

  // Dynamic Scope
  if (!(schema.document.baseUri in ast.metaData)) {
    ast.metaData[schema.document.baseUri] = {
      dynamicAnchors: schema.document.dynamicAnchors
    };
  }

  // Compile
  const url = canonicalUri(schema);
  if (!(url in ast)) {
    ast[url] = false; // Place dummy entry in ast to avoid recursive loops

    const schemaValue = value(schema);
    if (!["object", "boolean"].includes(typeof schemaValue)) {
      throw Error(`No schema found at '${url}'`);
    }

    if (typeof schemaValue === "boolean") {
      ast[url] = schemaValue;
    } else {
      const keywords = [];
      for await (const [keyword, keywordSchema] of entries(schema)) {
        const keywordHandler = getKeywordByName(keyword, schema.document.dialectId);
        if (keywordHandler.plugin) {
          ast.plugins.add(keywordHandler.plugin);
        }
        const keywordAst = await keywordHandler.compile(keywordSchema, ast, schema);
        keywords.push([keywordHandler.id, pointerAppend(keyword, url), keywordAst]);
      }
      ast[url] = keywords;

      // Keyword order shouldn't matter, but the unevaluated keywords are an exception :-(
      ast[url].sort(keywordComparator);
    }
  }

  return url;
};

const lastKeywords = new Set([
  "https://json-schema.org/keyword/unevaluatedProperties",
  "https://json-schema.org/keyword/unevaluatedItems"
]);
const keywordComparator = (a, b) => lastKeywords.has(a[0]) - lastKeywords.has(b[0]);

// This is the hottest function in validation. Keeping a separate path for when there are no plugins lets V8 optimize
// each path for its own case.
const interpret = (url, instance, context) => {
  return (context.plugins.length ?? context.plugins.size) === 0
    ? interpretWithoutPlugins(url, instance, context)
    : interpretWithPlugins(url, instance, context, pluginHooks(context));
};

const interpretWithoutPlugins = (url, instance, context) => {
  const schemaAst = context.ast[url];
  if (typeof schemaAst === "boolean") {
    return schemaAst;
  }

  let valid = true;
  for (const node of schemaAst) {
    const keywordContext = {
      ast: context.ast,
      plugins: context.plugins
    };
    if (!getKeyword(node[0]).interpret(node[2], instance, keywordContext)) {
      valid = false;
    }
  }

  return valid;
};

const interpretWithPlugins = (url, instance, context, hooks) => {
  let valid = true;

  for (const plugin of hooks.beforeSchema) {
    plugin.beforeSchema(url, instance, context);
  }

  const schemaAst = context.ast[url];
  if (typeof schemaAst === "boolean") {
    valid = schemaAst;
  } else {
    for (const node of schemaAst) {
      const keyword = getKeyword(node[0]);

      const keywordContext = {
        ast: context.ast,
        plugins: context.plugins,
        pluginHooks: hooks
      };
      for (const plugin of hooks.beforeKeyword) {
        plugin.beforeKeyword(node, instance, keywordContext, context, keyword);
      }
      const isKeywordValid = keyword.interpret(node[2], instance, keywordContext);
      if (!isKeywordValid) {
        valid = false;
      }

      for (const plugin of hooks.afterKeyword) {
        plugin.afterKeyword(node, instance, keywordContext, isKeywordValid, context, keyword);
      }
    }
  }

  for (const plugin of hooks.afterSchema) {
    plugin.afterSchema(url, instance, context, valid);
  }
  return valid;
};

// Most plugins only implement some hooks. Grouping them by hook means each loop above only visits the plugins that
// implement it. The groups are passed down to nested evaluations through the context so they only need to be computed
// once per evaluation. They're recomputed if the context's plugins aren't the ones they were made for, such as when a
// keyword evaluates a subschema with different plugins.
const pluginHooks = (context) => {
  const plugins = context.plugins;
  const pluginCount = plugins.length ?? plugins.size;
  let hooks = context.pluginHooks;
  if (hooks === undefined || hooks.plugins !== plugins || hooks.pluginCount !== pluginCount) {
    const pluginArray = [...plugins];
    hooks = {
      plugins: plugins,
      pluginCount: pluginCount,
      beforeSchema: pluginArray.filter((plugin) => plugin.beforeSchema),
      beforeKeyword: pluginArray.filter((plugin) => plugin.beforeKeyword),
      afterKeyword: pluginArray.filter((plugin) => plugin.afterKeyword),
      afterSchema: pluginArray.filter((plugin) => plugin.afterSchema)
    };
    context.pluginHooks = hooks;
  }

  return hooks;
};

export default { id, compile, interpret };
