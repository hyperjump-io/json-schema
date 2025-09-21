const dateFullyear = `\\d{4}`;
const dateMonth = `(?:0[1-9]|1[0-2])`; // 01-12
const dateMday = `\\d{2}`; // 01-28, 01-29, 01-30, 01-31 based on month/year
const fullDate = `(?<year>${dateFullyear})-(?<month>${dateMonth})-(?<day>${dateMday})`;

const datePattern = new RegExp(`^${fullDate}$`);
export const isDate = (date) => {
  const parsedDate = datePattern.exec(date)?.groups;
  if (!parsedDate) {
    return false;
  }

  let numberOfDays;
  switch (parsedDate.month) {
    case "01":
    case "03":
    case "05":
    case "07":
    case "08":
    case "10":
    case "12":
      numberOfDays = 31;
      break;
    case "04":
    case "06":
    case "09":
    case "11":
      numberOfDays = 30;
      break;
    case "02":
      numberOfDays = isLeapYear(Number.parseInt(parsedDate.year, 10)) ? 29 : 28;
      break;
    default:
      return false;
  }

  const day = Number.parseInt(parsedDate.day, 10);
  if (day < 1 || day > numberOfDays) {
    return false;
  }

  return true;
};

const isLeapYear = (year) => {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
};

export default {
  id: "https://json-schema.org/format/date",
  handler: (date) => typeof date !== "string" || isDate(date)
};
