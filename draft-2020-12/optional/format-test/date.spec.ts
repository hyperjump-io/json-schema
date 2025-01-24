
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatValidators } from '../format/date.js';
import { setValidateFormats } from '../../../lib/configuration.js';

describe("Date Format Validation", () => {

  // Test when validation is enabled
  describe("With validation enabled", () => {
    beforeEach(() => {
      setValidateFormats(true);
    });

    afterEach(() => {
      setValidateFormats(false); 
    });

    it("should ignore integers and still pass validation", () => {
      const data = 12;
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should ignore floats and still pass validation", () => {
      const data = 13.7;
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should ignore objects and still pass validation", () => {
      const data = {};
      expect(formatValidators["date"](data)).toBe(true);
    });

    // it("should ignore arrays and still pass validation", () => {
    //   const data = [];
    //   expect(formatValidators["date"](data)).toBe(true);
    // });

    it("should ignore booleans and still pass validation", () => {
      const data = false;
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should ignore nulls and still pass validation", () => {
      const data = null;
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should validate a valid date string", () => {
      const data = "1963-06-19";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should validate a valid date string with 31 days in January", () => {
      const data = "2020-01-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in January", () => {
      const data = "2020-01-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 28 days in February (normal year)", () => {
      const data = "2021-02-28";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 29 days in February (normal year)", () => {
      const data = "2021-02-29";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 29 days in February (leap year)", () => {
      const data = "2020-02-29";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 30 days in February (leap year)", () => {
      const data = "2020-02-30";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in March", () => {
      const data = "2020-03-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in March", () => {
      const data = "2020-03-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 30 days in April", () => {
      const data = "2020-04-30";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 31 days in April", () => {
      const data = "2020-04-31";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in May", () => {
      const data = "2020-05-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in May", () => {
      const data = "2020-05-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 30 days in June", () => {
      const data = "2020-06-30";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 31 days in June", () => {
      const data = "2020-06-31";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in July", () => {
      const data = "2020-07-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in July", () => {
      const data = "2020-07-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in August", () => {
      const data = "2020-08-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in August", () => {
      const data = "2020-08-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 30 days in September", () => {
      const data = "2020-09-30";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 31 days in September", () => {
      const data = "2020-09-31";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in October", () => {
      const data = "2020-10-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in October", () => {
      const data = "2020-10-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 30 days in November", () => {
      const data = "2020-11-30";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 31 days in November", () => {
      const data = "2020-11-31";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a valid date string with 31 days in December", () => {
      const data = "2020-12-31";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with 32 days in December", () => {
      const data = "2020-12-32";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string with an invalid month", () => {
      const data = "2020-13-01";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string in MM/DD/YYYY format", () => {
      const data = "06/19/1963";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a non-RFC3339 ISO8601 string with a day of year format", () => {
      const data = "2013-350";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string with non-padded month", () => {
      const data = "1998-1-20";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string with non-padded day", () => {
      const data = "1998-01-1";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string with an invalid month", () => {
      const data = "1998-13-01";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string with an invalid month-day combination", () => {
      const data = "1998-04-31";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a date string if 2021 is not a leap year", () => {
      const data = "2021-02-29";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should validate a date string if 2020 is a leap year", () => {
      const data = "2020-02-29";
      expect(formatValidators["date"](data)).toBe(true);
    });

    it("should invalidate a date string with a non-ASCII character", () => {
      const data = "1963-06-1৪";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a non-RFC3339 ISO8601 date without dashes", () => {
      const data = "20230328";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a non-RFC3339 ISO8601 week-based date", () => {
      const data = "2023-W01";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a non-RFC3339 ISO8601 week-based date with day of week", () => {
      const data = "2023-W13-2";
      expect(formatValidators["date"](data)).toBe(false);
    });

    it("should invalidate a non-RFC3339 ISO8601 week rollover date", () => {
      const data = "2022W527";
      expect(formatValidators["date"](data)).toBe(false);
    });

  });
});
