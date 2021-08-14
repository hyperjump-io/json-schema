const isObject = (value) => typeof value === "object" && !Array.isArray(value) && value !== null;
const escapeRegExp = (string) => string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

const splitUrl = (url) => {
  const indexOfHash = url.indexOf("#");
  const ndx = indexOfHash === -1 ? url.length : indexOfHash;
  const urlReference = url.slice(0, ndx);
  const urlFragment = url.slice(ndx + 1);

  return [decodeURI(urlReference), decodeURI(urlFragment)];
};

module.exports = { isObject, escapeRegExp, splitUrl };
