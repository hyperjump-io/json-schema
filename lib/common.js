const isObject = (value) => typeof value === "object" && !Array.isArray(value) && value !== null;

const splitUrl = (url) => {
  const [urlReference, urlFragment = ""] = url.split("#", 2);
  return [decodeURI(urlReference), decodeURI(urlFragment)];
};

module.exports = { isObject, splitUrl };
