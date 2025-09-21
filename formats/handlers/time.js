const timeHour = `(?:[01]\\d|2[0-3])`; // 00-23
const timeMinute = `[0-5]\\d`; // 00-59
const timeSecond = `[0-5]\\d`; // 00-59
const timeSecondAllowLeapSeconds = `(?<seconds>[0-5]\\d|60)`; // 00-58, 00-59, 00-60 based on leap second rules
const timeSecfrac = `\\.\\d+`;
const timeNumoffset = `[+-]${timeHour}:${timeMinute}`;
const timeOffset = `(?:[zZ]|${timeNumoffset})`;
const partialTime = `${timeHour}:${timeMinute}:${timeSecond}(?:${timeSecfrac})?`;
const fullTime = `${partialTime}${timeOffset}`;

export const isTime = RegExp.prototype.test.bind(new RegExp(`^${fullTime}$`));

const timePattern = new RegExp(`^${timeHour}:${timeMinute}:${timeSecondAllowLeapSeconds}(?:${timeSecfrac})?${timeOffset}$`);
export const parseTime = (time) => {
  return timePattern.exec(time)?.groups;
};

export default {
  id: "https://json-schema.org/format/time",
  handler: (time) => typeof time !== "string" || isTime(time)
};
