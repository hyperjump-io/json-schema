const curry = require("just-curry-it");
const PubSub = require("./pubsub");
const Configuration = require("./configuration");
const Instance = require("./instance");
const InvalidSchemaError = require("./invalid-schema-error");
const MediaTypes = require("./media-types");
const Schema = require("./schema");
const Validate = require("./keywords/validate");


const FLAG = "FLAG", BASIC = "BASIC", DETAILED = "DETAILED", VERBOSE = "VERBOSE";
Configuration.setMetaOutputFormat(FLAG);

const validate = async (schema, value = undefined, outputFormat = undefined) => {
  const compiled = await compile(schema);
  const interpretAst = (value, outputFormat) => interpret(compiled, Instance.cons(value), outputFormat);

  return value === undefined ? interpretAst : interpretAst(value, outputFormat);
};

const compile = async (schema) => {
  const ast = { metaData: {} };
  const schemaUri = await Validate.compile(schema, ast);
  return { ast, schemaUri };
};

const interpret = curry(({ ast, schemaUri }, value, outputFormat = FLAG) => {
  if (![FLAG, BASIC, DETAILED, VERBOSE].includes(outputFormat)) {
    throw Error(`The '${outputFormat}' error format is not supported`);
  }

  const output = [];
  const subscriptionToken = PubSub.subscribe("result", outputHandler(outputFormat, output));
  Validate.interpret(schemaUri, value, ast, {});
  PubSub.unsubscribe("result", subscriptionToken);

  return output[0];
});

const outputHandler = (outputFormat, output) => {
  const resultStack = [];

  return (message, keywordResult) => {
    if (message === "result") {
      const { keyword, absoluteKeywordLocation, instanceLocation, valid } = keywordResult;
      const result = { keyword, absoluteKeywordLocation, instanceLocation, valid, errors: [] };
      resultStack.push(result);
    } else if (message === "result.start") {
      resultStack.push(message);
    } else if (message === "result.end") {
      const result = resultStack.pop();
      while (resultStack[resultStack.length - 1] !== "result.start") {
        const topResult = resultStack.pop();

        const errors = [topResult];
        if (outputFormat === BASIC) {
          errors.push(...topResult.errors);
          delete topResult.errors;
        }

        if (outputFormat === VERBOSE || (outputFormat !== FLAG && !topResult.valid)) {
          result.errors.unshift(...errors);
        }
      }
      resultStack[resultStack.length - 1] = result;

      output[0] = result;
    }
  };
};

const metaValidators = {};
PubSub.subscribe("validate.metaValidate", async (message, schema) => {
  if (Configuration.getShouldMetaValidate() && !schema.validated) {
    Schema.markValidated(schema.id);

    // Compile
    if (!(schema.dialectId in metaValidators)) {
      // Dynamic references are unstable, but are necessary for meta-validation
      const dyanmicRefKeywordId = "https://json-schema.org/keyword/dynamicRef";
      const isDynamicRefEnabled = Configuration.isUnstableKeywordEnabled(dyanmicRefKeywordId);
      Configuration.setUnstableKeywordEnabled(dyanmicRefKeywordId, true);

      const metaSchema = await Schema.get(schema.dialectId);
      const compiledSchema = await compile(metaSchema);
      metaValidators[metaSchema.id] = interpret(compiledSchema);

      Configuration.setUnstableKeywordEnabled(dyanmicRefKeywordId, isDynamicRefEnabled);
    }

    // Interpret
    const schemaInstance = Instance.cons(schema.schema, schema.id);
    const metaResults = metaValidators[schema.dialectId](schemaInstance, Configuration.getMetaOutputFormat());
    if (!metaResults.valid) {
      throw new InvalidSchemaError(metaResults);
    }
  }
});

const add = (schema, url = "", defaultSchemaVersion = "") => {
  const id = Schema.add(schema, url, defaultSchemaVersion);
  delete metaValidators[id];
};

module.exports = {
  FLAG, BASIC, DETAILED, VERBOSE,
  validate, compile, interpret,
  add, get: Schema.get, addMediaTypePlugin: MediaTypes.addPlugin
};
