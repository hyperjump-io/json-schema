import { toAbsoluteUri } from "./common.js";


const _keywords = {};

// This is called for every keyword evaluated, so results are cached. Otherwise, ids with a fragment would create a new
// object every time. The cache is cleared whenever a keyword is added.
const keywordCache = new Map();
export const getKeyword = (id) => {
  let keyword = keywordCache.get(id);
  if (keyword === undefined) {
    if (id.indexOf("#") !== -1) {
      const absoluteId = toAbsoluteUri(id);
      keyword = { ..._keywords[absoluteId], id };
    } else {
      keyword = _keywords[id];
    }

    if (keyword !== undefined) {
      keywordCache.set(id, keyword);
    }
  }

  return keyword;
};

export const getKeywordByName = (keyword, dialectId) => {
  const keywordId = getKeywordId(keyword, dialectId);
  if (!keywordId) {
    throw Error(`Encountered unknown keyword '${keyword}'`);
  }

  const keywordHandler = getKeyword(keywordId);
  if (!keywordHandler) {
    throw Error(`Encountered unsupported keyword ${keyword}. You can provide an implementation for the '${keywordId}' keyword using the 'addKeyword' function.`);
  }

  return keywordHandler;
};

export const addKeyword = (keywordHandler) => {
  _keywords[keywordHandler.id] = keywordHandler;
  keywordCache.clear();
};

const _vocabularies = {};
export const defineVocabulary = (id, keywords) => {
  _vocabularies[id] = keywords;
};

const _formats = {};
export const addFormat = (format) => {
  _formats[format.id] = format.handler;
};

export const getFormatHandler = (formatUri) => {
  return _formats[formatUri];
};

export const setFormatHandler = (keywordUri, formatName, formatUri) => {
  _keywords[keywordUri].formats[formatName] = formatUri;
};

export const removeFormatHandler = (keywordUri, formatName) => {
  delete _keywords[keywordUri].formats[formatName];
};

const _dialects = {};

export const getKeywordId = (keyword, dialectId) => {
  const dialect = getDialect(dialectId);
  return dialect.keywords[keyword]
    ?? ((dialect.allowUnknownKeywords || keyword.startsWith("x-"))
      ? `https://json-schema.org/keyword/unknown#${keyword}`
      : undefined);
};

export const getKeywordName = (dialectId, keywordId) => {
  return getDialect(dialectId).keywordNames.get(keywordId);
};

const getDialect = (dialectId) => {
  if (!(dialectId in _dialects)) {
    throw Error(`Encountered unknown dialect '${dialectId}'`);
  }

  return _dialects[dialectId];
};

export const hasDialect = (dialectId) => dialectId in _dialects;

export const loadDialect = (dialectId, dialect, allowUnknownKeywords = false, isPersistent = true) => {
  _dialects[dialectId] = {
    keywords: {},
    keywordNames: new Map(),
    allowUnknownKeywords: allowUnknownKeywords,
    persistentDialects: _dialects[dialectId]?.persistentDialects || isPersistent
  };

  for (const vocabularyId in dialect) {
    if (vocabularyId in _vocabularies) {
      for (const keyword in _vocabularies[vocabularyId]) {
        let keywordId = _vocabularies[vocabularyId][keyword];
        if (!dialect[vocabularyId]) {
          if (vocabularyId === "https://json-schema.org/draft/2019-09/vocab/format") {
            // Handle inconsistent 2019-09 behavior
            keywordId = "https://json-schema.org/keyword/draft-2019-09/format";
          } else if (!(keywordId in _keywords)) {
            // Allow keyword to be ignored
            keywordId = `https://json-schema.org/keyword/unknown#${keyword}`;
          }
        }
        _dialects[dialectId].keywords[keyword] = keywordId;
      }
    } else if (!allowUnknownKeywords || dialect[vocabularyId]) {
      delete _dialects[dialectId];
      throw Error(`Unrecognized vocabulary: ${vocabularyId}. You can define this vocabulary with the 'defineVocabulary' function.`);
    }
  }

  // Reverse index for getKeywordName, which is called many times for every schema. If more than one keyword maps to
  // the same id, the first one wins.
  const { keywords, keywordNames } = _dialects[dialectId];
  for (const keyword in keywords) {
    if (!keywordNames.has(keywords[keyword])) {
      keywordNames.set(keywords[keyword], keyword);
    }
  }
};

export const unloadDialect = (dialectId) => {
  if (!_dialects[dialectId]?.persistentDialects) {
    delete _dialects[dialectId];
  }
};
