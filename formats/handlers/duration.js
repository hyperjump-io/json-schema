const durSecond = `\\d+S`;
const durMinute = `\\d+M(?:${durSecond})?`;
const durHour = `\\d+H(?:${durMinute})?`;
const durTime = `T(?:${durHour}|${durMinute}|${durSecond})`;
const durDay = `\\d+D`;
const durWeek = `\\d+W`;
const durMonth = `\\d+M(?:${durDay})?`;
const durYear = `\\d+Y(?:${durMonth})?`;
const durDate = `(?:${durDay}|${durMonth}|${durYear})(?:${durTime})?`;
const duration = `P(?:${durDate}|${durTime}|${durWeek})`;

export const isDuration = RegExp.prototype.test.bind(new RegExp(`^${duration}$`));

export default {
  id: "https://json-schema.org/format/duration",
  handler: (duration) => typeof duration !== "string" || isDuration(duration)
};
