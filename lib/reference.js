const $__value = Symbol("$__value");
const $__href = Symbol("$__href");

const cons = (href, value) => Object.freeze({
  [$__href]: href,
  [$__value]: value
});

const isReference = (ref) => ref && ref[$__href] !== undefined;
const href = (ref) => ref[$__href];
const value = (ref) => ref[$__value];

module.exports = { cons, isReference, href, value };
