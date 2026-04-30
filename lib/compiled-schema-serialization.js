import { getKeyword } from "./keywords.js";


const PLUGIN_MARKER = "fa3b6a9e-7c2d-4e9f-b1a0-8c2e1d3f4b5a";
const REGEXP_MARKER = "a6d8f3e1-9b2c-4f7a-8d5b-1c2e3f4a5b6c";

export const serialize = (compiledSchema) => {
  const ast = compiledSchema?.ast ? { ...compiledSchema.ast } : undefined;
  if (ast && (Array.isArray(ast.plugins) || ast.plugins instanceof Set)) {
    ast.plugins = [...ast.plugins].map((plugin) => {
      if (!plugin?.id) {
        throw Error("Cannot serialize plugin without id");
      }
      return { [PLUGIN_MARKER]: true, id: plugin.id };
    });
  }

  const toSerialize = ast ? { ...compiledSchema, ast } : compiledSchema;

  return JSON.stringify(toSerialize, (_key, value) => {
    if (value instanceof RegExp) {
      return { [REGEXP_MARKER]: true, source: value.source, flags: value.flags };
    }

    return value;
  });
};

export const deserialize = (serialized, options = {}) => {
  const parsed = JSON.parse(serialized, (_key, value) => {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (value[REGEXP_MARKER]) {
      return new RegExp(value.source, value.flags);
    }

    // Legacy support: old tests/serializations used a __type marker.
    if (value.__type === "RegExp") {
      return new RegExp(value.source, value.flags);
    }

    if (value[PLUGIN_MARKER]) {
      return resolvePlugin(value.id, options);
    }

    if (value.__type === "Plugin") {
      return resolvePlugin(value.id, options);
    }

    if (value.__type === "PluginSet") {
      // Legacy PluginSet: restore to an array of plugin objects
      return (value.values || []).map((p) => resolvePlugin(p.id, options));
    }

    return value;
  });

  return parsed;
};

const resolveBuiltInPlugin = (pluginId) => {
  if (typeof pluginId !== "string" || !pluginId.endsWith("#plugin")) {
    return;
  }

  const keywordId = pluginId.slice(0, -"#plugin".length);
  const plugin = getKeyword(keywordId)?.plugin;
  if (plugin?.id === pluginId) {
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
