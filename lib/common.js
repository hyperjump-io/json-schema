const isObject = (value) => typeof value === "object" && !Array.isArray(value) && value !== null;
const escapeRegExp = (string) => string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

module.exports = { isObject, escapeRegExp };
