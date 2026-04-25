import { getKeyword } from "./keywords.js";


const isPlugin = (value) => {
  return !!value
    && typeof value === "object"
    && typeof value.id === "string"
    && (
      typeof value.beforeSchema === "function"
      || typeof value.beforeKeyword === "function"
      || typeof value.afterKeyword === "function"
      || typeof value.afterSchema === "function"
    );
};

const serializePluginReference = (plugin) => {
  if (!plugin?.id) {
    throw Error("Cannot serialize plugin without id");
  }

  return { __type: "Plugin", id: plugin.id };
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

export const serialize = (compiledSchema) => {
  return JSON.stringify(compiledSchema, (_key, value) => {
    if (value instanceof RegExp) {
      return { __type: "RegExp", source: value.source, flags: value.flags };
    }

    if (value instanceof Set) {
      return {
        __type: "PluginSet",
        values: [...value].map((plugin) => serializePluginReference(plugin))
      };
    }

    if (isPlugin(value)) {
      return serializePluginReference(value);
    }

    return value;
  });
};

export const deserialize = (serialized, options = {}) => {
  return JSON.parse(serialized, (_key, value) => {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (value.__type === "RegExp") {
      return new RegExp(value.source, value.flags);
    }

    if (value.__type === "Plugin") {
      return resolvePlugin(value.id, options);
    }

    if (value.__type === "PluginSet") {
      return new Set(value.values);
    }

    return value;
  });
};
