let metaOutputFormat;
let shouldMetaValidate = true;
let unstableKeywordEnabled = {};

const getMetaOutputFormat = () => metaOutputFormat;
const setMetaOutputFormat = (format) => {
  metaOutputFormat = format;
};

const getShouldMetaValidate = () => shouldMetaValidate;
const setShouldMetaValidate = (isEnabled) => {
  shouldMetaValidate = isEnabled;
};

const isUnstableKeywordEnabled = (keywordId) => unstableKeywordEnabled[keywordId];
const setUnstableKeywordEnabled = (keywordId, isEnabled) => {
  unstableKeywordEnabled[keywordId] = isEnabled;
};

module.exports = {
  setMetaOutputFormat, getShouldMetaValidate,
  setShouldMetaValidate, getMetaOutputFormat,
  setUnstableKeywordEnabled, isUnstableKeywordEnabled
};
