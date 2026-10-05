import curry from "just-curry-it";
import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { subscribe } from "./pubsub.js";
import {
  setMetaSchemaOutputFormat,
  getShouldValidateSchema,
  getMetaSchemaOutputFormat
} from "./configuration.js";
import * as Instance from "./instance.js";
import { InvalidSchemaError } from "./invalid-schema-error.js";
import { getSchema, registerSchema, unregisterSchema as schemaUnregister } from "./schema.js";
import { getKeywordName } from "./keywords.js";
import Validation from "./keywords/validation.js";
import { BasicOutputPlugin } from "./evaluation-plugins/basic-output.js";
import { DetailedOutputPlugin } from "./evaluation-plugins/detailed-output.js";
import { serialize, deserialize } from "./compiled-schema-serialization.js";


export const FLAG = "FLAG", BASIC = "BASIC", DETAILED = "DETAILED";
setMetaSchemaOutputFormat(FLAG);

const outputFormats = {};

export const setOutputFormat = (outputFormat, outputFormatHandler) => {
  outputFormats[outputFormat] = outputFormatHandler;
};

setOutputFormat(FLAG, () => ({}));

setOutputFormat(BASIC, () => {
  const plugin = new BasicOutputPlugin();
  return { plugin, getErrors: () => plugin.errors };
});

setOutputFormat(DETAILED, () => {
  const plugin = new DetailedOutputPlugin();
  return { plugin, getErrors: () => plugin.errors };
});

export const validate = async (url, value = undefined, options = undefined) => {
  const schema = await getSchema(url);
  const compiled = await compile(schema);
  const interpretAst = (value, options) => interpretCompiled(compiled, Instance.fromJs(value), options);
  interpretAst.serialize = () => serialize(compiled);

  return value === undefined ? interpretAst : interpretAst(value, options);
};

export const restoreValidator = (json) => {
  const compiled = deserialize(json);
  const interpretAst = (value, options) => interpretCompiled(compiled, Instance.fromJs(value), options);
  interpretAst.serialize = () => serialize(compiled);

  return interpretAst;
};

export const compile = async (schema) => {
  const ast = { metaData: {}, plugins: new Set() };
  const schemaUri = await Validation.compile(schema, ast);
  return { ast, schemaUri };
};

// Validators call this directly rather than the curried interpret because the currying adds overhead to every call
const interpretCompiled = ({ ast, schemaUri }, instance, options = FLAG) => {
  const validationOptions = typeof options === "string" ? { outputFormat: options } : options;
  const outputFormat = validationOptions.outputFormat ?? FLAG;
  const plugins = validationOptions.plugins ?? [];

  if (!(outputFormat in outputFormats)) {
    throw Error(`Unsupported output format '${outputFormat}'`);
  }
  const output = outputFormats[outputFormat](validationOptions);

  const context = { ast, plugins: [...ast.plugins, ...plugins] };
  if (output.plugin) {
    context.plugins.push(output.plugin);
  }

  const valid = Validation.interpret(schemaUri, instance, context);
  return !valid && output.getErrors ? { valid, errors: output.getErrors(instance, context) } : { valid };
};

export const interpret = curry(interpretCompiled);

const metaValidators = {};
subscribe("validate.metaValidate", async (_message, schema) => {
  if (getShouldValidateSchema() && !schema.document.validated) {
    schema.document.validated = true;

    // Compile
    if (!(schema.document.dialectId in metaValidators)) {
      const metaSchema = await getSchema(schema.document.dialectId, schema);
      const compiledSchema = await compile(metaSchema);
      metaValidators[schema.document.dialectId] = interpret(compiledSchema);
    }

    // Interpret
    const schemaInstance = Instance.fromJs(schema.document.root, schema.document.baseUri);
    const metaResults = metaValidators[schema.document.dialectId](schemaInstance, getMetaSchemaOutputFormat());
    if (!metaResults.valid) {
      throw new InvalidSchemaError(metaResults);
    }
  }
});

/**
 * @deprecated since 1.7.0. Use registerSchema instead.
 */
export const addSchema = (schema, retrievalUri = undefined, contextDialectId = undefined) => {
  const dialectId = typeof schema.$schema === "string" ? toAbsoluteIri(schema.$schema) : contextDialectId;
  const idToken = getKeywordName(dialectId, "https://json-schema.org/keyword/id")
    || getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/id");
  const id = typeof schema[idToken] === "string" ? resolveIri(schema[idToken], retrievalUri) : retrievalUri;

  if (id) {
    unregisterSchema(id);
  }

  registerSchema(schema, retrievalUri, contextDialectId);
};

export const unregisterSchema = (uri) => {
  schemaUnregister(uri);
  delete metaValidators[uri];
};
