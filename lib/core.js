const Json = require("./json");
const PubSub = require("./pubsub");
const Schema = require("./schema");


const FLAG = "FLAG", BASIC = "BASIC", DETAILED = "DETAILED", VERBOSE = "VERBOSE";

let metaOutputFormat = DETAILED;

const validate = async (schema, value = undefined, outputFormat = undefined) => {
  const ast = {};
  const schemaUri = await compileSchema(schema, ast);
  const interpret = (value, outputFormat = FLAG) => {
    let output = [];

    if (![FLAG, BASIC, DETAILED, VERBOSE].includes(outputFormat)) {
      throw Error(`The '${outputFormat}' error format is not supported`);
    } else {
      PubSub.subscribe("result", outputHandler(outputFormat, output));
    }

    interpretSchema(schemaUri, Json.cons(value), ast);
    return output[0];
  };

  return value === undefined ? interpret : interpret(value, outputFormat);
};

const outputHandler = (outputFormat, output) => {
  const resultStack = [];

  return (message, result) => {
    result.errors = [];
    while (resultStack.length > 0 && (isChild(resultStack[resultStack.length - 1], result) || isRef(result))) {
      const topResult = resultStack.pop();
      let errors = [];
      if (outputFormat === BASIC) {
        errors = topResult.errors;
        delete topResult.errors;
      }
      result.errors.unshift(topResult, ...errors);
      if (isRef(result)) {
        break;
      }
    }

    if (outputFormat === VERBOSE || outputFormat !== FLAG && !result.valid) {
      resultStack.push(result);
    }

    output[0] = result;
  };
};

const isChild = (topResult, nextResult) => {
  return topResult.instanceLocation.startsWith(nextResult.instanceLocation)
      && topResult.absoluteKeywordLocation.startsWith(nextResult.absoluteKeywordLocation);
};

const isRef = (result) => {
  return result.absoluteKeywordLocation.endsWith("$ref")
      || result.absoluteKeywordLocation.endsWith("$recursiveRef");
};

const setMetaOutputFormat = (format) => {
  metaOutputFormat = format;
};

const _keywords = {};
const getKeyword = (id) => _keywords[id];
const hasKeyword = (id) => id in _keywords;
const addKeyword = (id, handler) => {
  _keywords[id] = handler;
};

const _vocabularies = {};
const addVocabulary = (id, keywords) => {
  _vocabularies[id] = keywords;
};

const metaValidators = {};
const metaValidated = {};
const compileSchema = async (schema, ast) => {
  if (!metaValidated[schema.id]) {
    // Determine JSON Schema version
    if (!hasKeyword(`${schema.schemaVersion}#validate`)) {
      throw Error(`Unsupported schema version: ${schema.schemaVersion}`);
    }

    // Meta validation
    const vocabulary = await getSchemaVocabulary(schema);
    if (!vocabulary) {
      if (!(schema.schemaVersion in metaValidators)) {
        const metaSchema = await Schema.get(schema.schemaVersion);

        const vocabulary = await getSchemaVocabulary(metaSchema);
        Object.entries(vocabulary || {})
          .forEach(([vocabularyId, isRequired]) => {
            if (vocabularyId in _vocabularies) {
              Object.entries(_vocabularies[vocabularyId])
                .forEach(([keyword, keywordHandler]) => {
                  addKeyword(`${schema.schemaVersion}#${keyword}`, keywordHandler);
                });
            } else if (isRequired) {
              throw Error(`Missing required vocabulary: ${vocabularyId}`);
            }
          });

        metaValidators[schema.schemaVersion] = await validate(metaSchema);
      }

      const schemaJson = Schema.value(schema);
      const metaResults = metaValidators[schema.schemaVersion](schemaJson, metaOutputFormat);
      if (!metaResults.valid) {
        throw metaResults;
      } else {
        metaValidated[schema.id] = true;
      }
    }
  }

  // Compile
  await getKeyword(`${schema.schemaVersion}#validate`).compile(schema, ast);
  return Schema.uri(schema);
};

const getSchemaVocabulary = async (schema) => {
  try {
    const vocabulary = await Schema.get("#/$vocabulary", schema);
    return Schema.value(vocabulary);
  } catch (error) {
  }
};

const interpretSchema = (schemaUrl, json, ast) => {
  const [schemaVersion] = ast[schemaUrl];
  return getKeyword(`${schemaVersion}#validate`).interpret(schemaUrl, json, ast);
};

module.exports = {
  validate, setMetaOutputFormat, FLAG, BASIC, DETAILED, VERBOSE,
  addKeyword, getKeyword, hasKeyword, addVocabulary,
  compileSchema, interpretSchema
};
