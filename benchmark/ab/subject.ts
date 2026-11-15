import type { Corpus } from "./corpus.ts";

/**
 * One of the copies of src/ that ab-setup.sh made in AB_DIR: `a` or `b`. Both
 * have to have the API from 2026-10-29 on (operations are functions, and
 * dialects are in the config). What operations take changed since: a
 * `JsonSchema` instance, then `configureJsonSchema`'s value, then a config
 * with `jsonSchemaMediaTypes`, then `jsonSchemaConfig`'s, so either side can
 * be any of them.
 */
export const load = async (dir: "a" | "b") => {
  if (!process.env.AB_DIR) {
    throw Error("Set AB_DIR to the directory ab-setup.sh made");
  }
  const src = new URL(`${process.env.AB_DIR}/${dir}/src/`, "file://").href;
  const api = await import(`${src}index.js`);
  const dialects = [];
  for (const [path, name] of [["draft-04", "draft04Dialect"], ["draft-06", "draft06Dialect"], ["draft-07", "draft07Dialect"], ["draft-2019-09", "draft201909Dialect"], ["draft-2020-12", "draft202012Dialect"]]) {
    dialects.push((await import(`${src}dialects/${path}/index.js`))[name]);
  }
  // Nothing is retrieved, because `allowRetrieval` isn't configured
  const options = { validateFormats: false, dialects };
  let jsonSchema;
  if (api.jsonSchemaConfig) {
    jsonSchema = api.jsonSchemaConfig(options);
  } else if (api.jsonSchemaMediaTypes) {
    jsonSchema = { mediaTypes: api.jsonSchemaMediaTypes(options) };
  } else if (api.configureJsonSchema) {
    jsonSchema = api.configureJsonSchema(options);
  } else {
    jsonSchema = new api.JsonSchema(options);
  }

  /** The corpus's entry schema compiled, with its schemas in a session registry */
  const compile = (corpus: Corpus) => {
    const entries = Object.entries(corpus.schemas).map(([retrievalUri, schema]) => ({ schema, retrievalUri, dialectUri: corpus.dialect }));
    return api.compile(jsonSchema, corpus.entry, { registry: new api.SchemaRegistry(entries) });
  };

  return { api, compile };
};

export type Subject = Awaited<ReturnType<typeof load>>;

export const noOpPlugin = {
  beforeSchema: () => undefined,
  afterSchema: () => undefined,
  beforeKeyword: () => undefined,
  afterKeyword: () => undefined,
  annotation: () => undefined
};
