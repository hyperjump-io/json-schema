const Json = require("./json");
const PubSub = require("./pubsub");
const Schema = require("./schema");


const metaValidators = {};

const validate = async (schema) => {
  if (!hasKeyword(schema.schemaVersion)) {
    throw Error(`Unsupported schema version: ${schema.schemaVersion}`);
  }
  const metaSchema = await Schema.get(schema.schemaVersion);
  const validateKeyword = getKeyword(schema.schemaVersion);

  if (schema.id !== schema.schemaVersion) {
    if (!(schema.schemaVersion in metaValidators)) {
      metaValidators[schema.schemaVersion] = await validate(metaSchema);
    }

    const metaResults = [];
    if (!metaValidators[schema.schemaVersion](schema, metaResults)) {
      throw metaResults;
    }
  }

  const vocabulary = await getSchemaVocabulary(metaSchema);
  Object.entries(vocabulary)
    .forEach(([vocabularyId, isRequired]) => {
      if (isRequired && !(vocabularyId in _vocabularies)) {
        throw Error(`Missing required vocabulary: ${vocabularyId}`);
      }
    });

  const ast = {};
  const schemaUri = Schema.uri(schema);
  await validateKeyword.compile(schema, ast);

  return (value, results = []) => {
    PubSub.subscribe("result", (message, result) => {
      results.push(result);
    });

    return validateKeyword.interpret(schemaUri, Json.cons(value), ast);
  };
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

module.exports = { validate, getKeyword, hasKeyword, addVocabulary, addSchemaVersion, compileSchema, interpretSchema };
