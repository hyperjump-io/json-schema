import { isDate } from "./date.js";
import { parseTime } from "./time.js";


// Date Time
export const isDateTime = (dateTime) => {
  const date = dateTime.substring(0, 10);
  const time = dateTime.substring(11);

  if (!isDate(date)) {
    return false;
  }

  const parsedTime = parseTime(time);
  if (!parsedTime) {
    return false;
  }

  // Validate leap seconds
  if (parsedTime.seconds === "60") {
    if (!leapSecondDates.has(date)) {
      return false;
    }

    // Date won't accept a leap second, so replace it before parsing
    const dateObject = new Date(`${date}T${time.replace("60", "59")}`);
    if (dateObject.getUTCHours() !== 23 || dateObject.getUTCMinutes() !== 59) {
      return false;
    }
  }

  return true;
};

const leapSecondDates = new Set([
  "1960-12-31",
  "1961-07-31",
  "1961-12-31",
  "1963-10-31",
  "1963-12-31",
  "1964-03-31",
  "1964-08-31",
  "1964-12-31",
  "1965-02-28",
  "1965-06-30",
  "1965-08-31",
  "1965-12-31",
  "1968-01-31",
  "1971-12-31",
  "1972-06-30",
  "1972-12-31",
  "1973-12-31",
  "1974-12-31",
  "1975-12-31",
  "1976-12-31",
  "1977-12-31",
  "1978-12-31",
  "1979-12-31",
  "1981-06-30",
  "1982-06-30",
  "1983-06-30",
  "1985-06-30",
  "1987-12-31",
  "1989-12-31",
  "1990-12-31",
  "1992-06-30",
  "1993-06-30",
  "1994-06-30",
  "1995-12-31",
  "1997-06-30",
  "1998-12-31",
  "2005-12-31",
  "2008-12-31",
  "2012-06-30",
  "2015-06-30",
  "2016-12-31"
]);

export default {
  id: "https://json-schema.org/format/date-time",
  handler: (dateTime) => typeof dateTime !== "string" || isDateTime(dateTime)
};
