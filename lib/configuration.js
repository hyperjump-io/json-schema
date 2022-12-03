let metaOutputFormat;
let shouldMetaValidate = true;
let unstableKeywordEnabled = {};

export const getMetaOutputFormat = () => metaOutputFormat;
export const setMetaOutputFormat = (format) => {
  metaOutputFormat = format;
};

export const getShouldMetaValidate = () => shouldMetaValidate;
export const setShouldMetaValidate = (isEnabled) => {
  shouldMetaValidate = isEnabled;
};

export const isUnstableKeywordEnabled = (keywordId) => unstableKeywordEnabled[keywordId];
export const setUnstableKeywordEnabled = (keywordId, isEnabled) => {
  unstableKeywordEnabled[keywordId] = isEnabled;
};
