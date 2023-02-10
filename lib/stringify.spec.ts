import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { jsonStringify } from "./common.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Json.stringify", () => {
  fs.readdirSync(`${__dirname}/json-tests`, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith("y_") && entry.name.endsWith(".json"))
    .forEach((entry) => {
      const file = `${__dirname}/json-tests/${entry.name}`;
      const value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;

      it(`${entry.name.substr(2)} without spaces`, () => {
        expect(jsonStringify(value)).to.eql(JSON.stringify(value));
      });

      it(`${entry.name.substr(2)} with spaces`, () => {
        expect(jsonStringify(value, undefined, "  ")).to.eql(JSON.stringify(value, undefined, "  "));
      });
    });

  describe("replacer", () => {
    it("should remove properties that return undefined", () => {
      const value = {
        aaa: "foo",
        bbb: "bar"
      };
      const replacer = (key: string, value: unknown) => {
        if (key !== "aaa") {
          return value;
        }
      };

      expect(jsonStringify(value, replacer)).to.eql(JSON.stringify(value, replacer));
    });

    it("should remove items that return undefined", () => {
      const value = ["foo", "bar"];
      const replacer = (key: string, value: unknown) => {
        if (key !== "0") {
          return value;
        }
      };

      expect(jsonStringify(value, replacer)).to.eql(JSON.stringify(value, replacer));
    });
  });
});
