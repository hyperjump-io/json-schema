import spacetime from 'spacetime';

/**
 * Function to validate the date-time format using spacetime.
 * @param {string} dateTimeString - The date-time string to validate.
 * @returns {boolean} - True if the date-time string is valid, false otherwise.
 */
const validateDateTime = (dateTimeString) => {
  if (typeof dateTimeString !== 'string') {
    return true;
  }
  
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  
  if (!regex.test(dateTimeString)) {
    return false;
  }
  
  const dt = spacetime(dateTimeString);
  return dt.isValid();
};

export const formatValidators = {
  "date": (value) => {
    return validateDateTime(value);
  }
};