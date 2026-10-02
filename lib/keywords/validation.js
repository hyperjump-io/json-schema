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
  const hooks = pluginHooks(context.plugins);
  return hooks === noHooks
    ? interpretWithoutPlugins(url, instance, context)
    : interpretWithPlugins(url, instance, context, hooks);
};

const interpretWithoutPlugins = (url, instance, context) => {
  if (typeof context.ast[url] === "boolean") {
    return context.ast[url];
  }

  let valid = true;
  for (const [keywordId, , keywordValue] of context.ast[url]) {
    const keywordContext = {
      ast: context.ast,
      plugins: context.plugins
    };
    if (!getKeyword(keywordId).interpret(keywordValue, instance, keywordContext)) {
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

  if (typeof context.ast[url] === "boolean") {
    valid = context.ast[url];
  } else {
    for (const node of context.ast[url]) {
      const [keywordId, , keywordValue] = node;
      const keyword = getKeyword(keywordId);

      const keywordContext = {
        ast: context.ast,
        plugins: context.plugins
      };
      for (const plugin of hooks.beforeKeyword) {
        plugin.beforeKeyword(node, instance, keywordContext, context, keyword);
      }
      const isKeywordValid = keyword.interpret(keywordValue, instance, keywordContext);
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
// implement it. The same plugins array (or Set) is passed through the whole evaluation, so it's cached by that object,
// but it's regrouped if plugins are added.
const noHooks = { pluginCount: 0, beforeSchema: [], beforeKeyword: [], afterKeyword: [], afterSchema: [] };
const pluginHooksCache = new WeakMap();
const pluginHooks = (plugins) => {
  const pluginCount = plugins.length ?? plugins.size;
  if (pluginCount === 0) {
    return noHooks;
  }

  let hooks = pluginHooksCache.get(plugins);
  if (hooks === undefined || hooks.pluginCount !== pluginCount) {
    const pluginArray = [...plugins];
    hooks = {
      pluginCount: pluginCount,
      beforeSchema: pluginArray.filter((plugin) => plugin.beforeSchema),
      beforeKeyword: pluginArray.filter((plugin) => plugin.beforeKeyword),
      afterKeyword: pluginArray.filter((plugin) => plugin.afterKeyword),
      afterSchema: pluginArray.filter((plugin) => plugin.afterSchema)
    };
    pluginHooksCache.set(plugins, hooks);
  }

  return hooks;
};

export default { id, compile, interpret };
