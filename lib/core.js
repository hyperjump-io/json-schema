const Json = require("./json");
const PubSub = require("./pubsub");
const Schema = require("./schema");


const FLAG = "FLAG", BASIC = "BASIC", DETAILED = "DETAILED", VERBOSE = "VERBOSE";

let metaOutputFormat = BASIC;

const metaValidators = {};

const validate = async (schema, value = undefined, outputFormat = undefined) => {
  // Determine JSON Schemea verison
  if (!hasKeyword(schema.schemaVersion)) {
    throw Error(`Unsupported schema version: ${schema.schemaVersion}`);
  }
  const validateKeyword = getKeyword(schema.schemaVersion);

  // Meta validation
  const metaSchema = await Schema.get(schema.schemaVersion);
  if (schema.id !== schema.schemaVersion) {
    if (!(schema.schemaVersion in metaValidators)) {
      metaValidators[schema.schemaVersion] = await validate(metaSchema);
    }

    const metaResults = metaValidators[schema.schemaVersion](schema, metaOutputFormat);
    if (!metaResults.valid) {
      throw metaResults;
    }
  }

  // Check for missing vocabularies
  const vocabulary = await getSchemaVocabulary(metaSchema);
  Object.entries(vocabulary)
    .forEach(([vocabularyId, isRequired]) => {
      if (isRequired && !(vocabularyId in _vocabularies)) {
        throw Error(`Missing required vocabulary: ${vocabularyId}`);
      }
    });

  // Compile
  const ast = {};
  const schemaUri = Schema.uri(schema);
  await validateKeyword.compile(schema, ast);

  // Interpret
  const interpret = (value, outputFormat = FLAG) => {
    let output = [];

    if (![FLAG, BASIC, DETAILED, VERBOSE].includes(outputFormat)) {
      throw Error(`The '${outputFormat}' error format is not supported`);
    } else {
      PubSub.subscribe("result", outputHandler(outputFormat, output));
    }

    validateKeyword.interpret(schemaUri, Json.cons(value), ast);
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

const _vocabularies = {};
const addVocabulary = (id, keywords) => {
  _vocabularies[id] = keywords;
};

const addSchemaVersion = (schemaVersion, handler, vocabularies) => {
  _keywords[schemaVersion] = handler;
  vocabularies.forEach((vocabularyId) => {
    Object.entries(_vocabularies[vocabularyId])
      .forEach(([keyword, keywordHandler]) => {
        _keywords[`${schemaVersion}#${keyword}`] = keywordHandler;
      });
  });
};

const getSchemaVocabulary = async (schema) => {
  const vocabulary = await Schema.get("#/$vocabulary", schema);
  try {
    return Schema.value(vocabulary);
  } catch (error) {
    return {};
  }
};

const compileSchema = async (schema, ast) => {
  await getKeyword(schema.schemaVersion).compile(schema, ast);
  return Schema.uri(schema);
};

const interpretSchema = (schemaUrl, json, ast) => {
  const [schemaVersion] = ast[schemaUrl];
  return getKeyword(schemaVersion).interpret(schemaUrl, json, ast);
};

module.exports = {
  validate, setMetaOutputFormat, FLAG, BASIC, DETAILED, VERBOSE,
  getKeyword, hasKeyword, addVocabulary, addSchemaVersion,
  compileSchema, interpretSchema
};
