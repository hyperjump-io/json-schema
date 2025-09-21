import { addFormat } from "../lib/keywords.js";

import dateTime from "./handlers/date-time.js";
import date from "./handlers/date.js";
import time from "./handlers/time.js";
import duration from "./handlers/duration.js";


addFormat(dateTime);
addFormat(date);
addFormat(time);
addFormat(duration);

export {
  getShouldValidateFormat,
  setShouldValidateFormat
} from "../lib/configuration.js";
