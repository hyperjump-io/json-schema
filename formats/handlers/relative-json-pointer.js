const unescaped = `[\\u{00}-\\u{2E}\\u{30}-\\u{7D}\\u{7F}-\\u{10FFFF}]`; // %x2F ('/') and %x7E ('~') are excluded from 'unescaped'
const escaped = `~[01]`; // representing '~' and '/', respectively
const referenceToken = `(?:${unescaped}|${escaped})*`;
const jsonPointer = `(?:/${referenceToken})*`;

const nonNegativeInteger = `(?:0|[1-9][0-9]*)`;
const indexManipulation = `(?:[+-]${nonNegativeInteger})`;
const relativeJsonPointer = `${nonNegativeInteger}(?:${indexManipulation}?${jsonPointer}|#)`;

export const isRelativeJsonPointer = RegExp.prototype.test.bind(new RegExp(`^${relativeJsonPointer}$`, "u"));

export default {
  id: "https://json-schema.org/format/relative-json-pointer",
  handler: (pointer) => typeof pointer !== "string" || isRelativeJsonPointer(pointer)
};
