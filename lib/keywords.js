const metaData = require("./keywords/meta-data");


const _keywords = {};
const getKeyword = (id) => _keywords[id] || id.startsWith("https://json-schema.org/keyword/unknown#") && { id, ...metaData };

const addKeyword = (keywordHandler) => {
  _keywords[keywordHandler.id] = {
    collectEvaluatedItems: (keywordValue, instance, ast, dynamicAnchors, isTop) => keywordHandler.interpret(keywordValue, instance, ast, dynamicAnchors, isTop) && new Set(),
    collectEvaluatedProperties: (keywordValue, instance, ast, dynamicAnchors, isTop) => keywordHandler.interpret(keywordValue, instance, ast, dynamicAnchors, isTop) && [],
    ...keywordHandler
  };
};

const _vocabularies = {};
const defineVocabulary = (id, keywords) => {
  _vocabularies[id] = keywords;
};

const _dialects = {};
const _allowUnknownKeywords = {};
const getKeywordId = (dialectId, keyword) => _dialects[dialectId]?.[keyword]
  || _allowUnknownKeywords[dialectId] && `https://json-schema.org/keyword/unknown#${keyword}`;
const getKeywordName = (dialectId, keywordId) => {
  for (const keyword in _dialects[dialectId]) {
    if (_dialects[dialectId][keyword] === keywordId) {
      return keyword;
    }
  }
};

const hasDialect = (dialectId) => dialectId in _dialects;

const loadDialect = (dialectId, dialect, allowUnknownKeywords = false) => {
  _allowUnknownKeywords[dialectId] = allowUnknownKeywords;

  _dialects[dialectId] = {};
  Object.entries(dialect)
    .forEach(([vocabularyId, isRequired]) => {
      if (vocabularyId in _vocabularies) {
        Object.entries(_vocabularies[vocabularyId])
          .forEach(([keyword, keywordId]) => {
            if (!(keywordId in _keywords)) {
              if (isRequired) {
                delete _dialects[dialectId];
                throw Error(`The '${keywordId}' keyword is not supported. This keyword was included in the '${vocabularyId}' vocabulary which is required by the '${dialectId}' dialect.`);
              } else {
                // Allow keyword to be ignored
                keywordId = `https://json-schema.org/keyword/unknown#${keyword}`;
              }
            }
            _dialects[dialectId][keyword] = keywordId;
          });
      } else {
        delete _dialects[dialectId];
        throw Error(`Unrecognized vocabulary: ${vocabularyId}. You can define this vocabulary with the 'defineVocabulary' function.`);
      }
    });
};

module.exports = {
  addKeyword, getKeyword, getKeywordId, getKeywordName, defineVocabulary, hasDialect, loadDialect
};
