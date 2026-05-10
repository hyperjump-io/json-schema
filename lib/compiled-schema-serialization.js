import { pipe, map, collectSet } from "@hyperjump/pact";
import { getKeyword } from "./keywords.js";


const REGEXP_MARKER = "a6d8f3e1-9b2c-4f7a-8d5b-1c2e3f4a5b6c";

export const serialize = (compiledSchema) => {
  const ast = compiledSchema.ast;
  const plugins = [];
  for (const plugin of ast.plugins) {
    if (!plugin.id) {
      throw Error("Cannot serialize plugin without id");
    }
    plugins.push(plugin.id);
  }
  ast.plugins = plugins;

  const toSerialize = ast ? { ...compiledSchema, ast } : compiledSchema;

  return JSON.stringify(toSerialize, (_key, value) => {
    if (value instanceof RegExp) {
      return { [REGEXP_MARKER]: { source: value.source, flags: value.flags } };
    }

    return value;
  });
};

export const deserialize = (serialized, options = {}) => {
  const parsed = JSON.parse(serialized, (_key, value) => {
    if (value[REGEXP_MARKER]) {
      return new RegExp(value[REGEXP_MARKER].source, value[REGEXP_MARKER].flags);
    }

    return value;
  });

  parsed.ast.plugins = pipe(
    parsed.ast.plugins,
    map((plugin) => resolvePlugin(plugin.id ?? plugin, options)),
    collectSet
  );

  return parsed;
};

const resolveBuiltInPlugin = (pluginId) => {
  if (!pluginId.endsWith("#plugin")) {
    return;
  }

  const keywordId = pluginId.slice(0, -"#plugin".length);
  const plugin = getKeyword(keywordId)?.plugin;
  if (plugin.id === pluginId) {
    return plugin;
  }
};

const resolvePlugin = (pluginId, options) => {
  const builtInPlugin = resolveBuiltInPlugin(pluginId);
  if (builtInPlugin) {
    return builtInPlugin;
  }

  const customPlugin = options?.pluginsById?.[pluginId];
  if (customPlugin) {
    return customPlugin;
  }

  throw Error(`Plugin with id '${pluginId}' is not found`);
};
