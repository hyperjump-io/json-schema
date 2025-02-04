import spacetime from "spacetime";


/**
 * @type {RegExp}
 */
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

/**
 * @param {string} dateTimeString
 * @returns {boolean}
 */
const validateDateTime = (dateTimeString) => {
  if (typeof dateTimeString !== "string") {
    return true;
  }

  if (!dateRegex.test(dateTimeString)) {
    return false;
  }

  const dt = spacetime(dateTimeString);
  return dt.isValid();
};

export const formatValidators = {
  date: (value) => {
    return validateDateTime(value);
  }
};
