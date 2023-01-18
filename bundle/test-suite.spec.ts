import { readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { addSchema } from "../lib/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-04/index.js";
import { bundle } from "./index.js";
import type { SchemaObject } from "../lib/schema.js";
import type { BundleOptions } from "./index.js";


type Test = {
  description: string;
  options?: BundleOptions;
  schema: SchemaObject | string;
  externalSchemas: SchemaObject[];
  bundledSchema: SchemaObject;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("bundle", () => {
  readdirSync(`${__dirname}/tests`, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .forEach((entry) => {
      const file = `${__dirname}/tests/${entry.name}`;
      const suite = JSON.parse(readFileSync(file, "utf8")) as Test[];

      describe(entry.name, () => {
        suite.forEach((test) => {
          it(test.description, async () => {
            let uri;
            if (typeof test.schema === "string") {
              uri = `file://${__dirname}/fixtures/${test.schema}`;
            } else {
              addSchema(test.schema, "https://bundler.hyperjump.io/schema");
              uri = "https://bundler.hyperjump.io/schema";
            }
            test.externalSchemas.forEach((schema) => {
              addSchema(schema);
            });
            const bundledSchema = await bundle(uri, test.options);
            expect(bundledSchema).eql(test.bundledSchema);
          });
        });
      });
    });
});
