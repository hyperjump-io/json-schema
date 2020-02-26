const isObject = (value) => typeof value === "object" && !Array.isArray(value) && value !== null;

module.exports = { isObject };
