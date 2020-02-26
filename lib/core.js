const Json = require("./json");
const Schema = require("./schema");


const metaValidators = {};

const validate = async (schema) => {
  if (!hasKeyword(schema.schemaVersion)) {
    throw Error(`Unsupported schema version: ${schema.schemaVersion}`);
  }
  const validateKeyword = getKeyword(schema.schemaVersion);

  if (schema.id !== schema.schemaVersion) {
    if (!(schema.schemaVersion in metaValidators)) {
      const metaSchema = await Schema.get(schema.schemaVersion);
      metaValidators[schema.schemaVersion] = await validate(metaSchema);
    }

    const metaResults = [];
    if (!metaValidators[schema.schemaVersion](schema, metaResults)) {
      throw metaResults;
    }
  }

  const ast = {};
  const schemaUri = Schema.uri(schema);
  await validateKeyword.compile(schema, ast);

  return (value, results = []) => validateKeyword.interpret(schemaUri, Json.cons(value), ast, results);
};

const keywords = {};
const addKeyword = (id, handler) => {
  keywords[id] = handler;
};
const getKeyword = (id) => keywords[id];
const hasKeyword = (id) => id in keywords;

const compileSchema = async (schema, ast) => {
  await getKeyword(schema.schemaVersion).compile(schema, ast);
  return Schema.uri(schema);
};

const interpretSchema = (schemaUrl, json, ast, results) => {
  const [schemaVersion] = ast[schemaUrl];
  return getKeyword(schemaVersion).interpret(schemaUrl, json, ast, results);
};

module.exports = { validate, addKeyword, getKeyword, hasKeyword, compileSchema, interpretSchema };
