import { isDateTimeExt } from "@hyperjump/json-schema-formats";


export default {
  id: "https://json-schema.org/format/date-time",
  handler: (dateTime) => typeof dateTime !== "string" || isDateTimeExt(dateTime)
};
