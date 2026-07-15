import { createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, relative } from "node:path";
import { getKeywordName } from "../lib/keywords.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";


export const testSuite = (path) => {
  const suite = [];
  readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .forEach((entry) => {
      const file = `${path}/${entry.name}`;
      const testCases = JSON.parse(readFileSync(file, "utf8"));
      suite.push(...testCases);
    });

  return suite;
};

export const md5 = (subject) => createHmac("md5", "hyperjump.io")
  .update(subject)
  .digest("hex");

const fixtures = {};
readdirSync("bundle/fixtures", { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
  .forEach((entry) => {
    const path = relative("bundle/fixtures", `${entry.parentPath}/${basename(entry.name, ".schema.json")}`);
    const retrievalUri = `https://bundler.hyperjump.io/${path}`;
    const fixture = JSON.parse(readFileSync(`${entry.parentPath}/${entry.name}`, "utf8"));
    fixtures[retrievalUri] = fixture;
  });

export const loadSchemas = (testCase, retrievalUri, dialect) => {
  const schema = JSON.parse(JSON.stringify(testCase.schema));

  const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
  if (!schema[definitionsToken]) {
    schema[definitionsToken] = {};
  }

  registerSchema(schema, retrievalUri, dialect);

  for (const retrievalUri in fixtures) {
    registerSchema(fixtures[retrievalUri], retrievalUri, dialect);
  }

  for (const retrievalUri in testCase.externalSchemas) {
    registerSchema(testCase.externalSchemas[retrievalUri], retrievalUri, dialect);
  }
};

export const unloadSchemas = (testCase, retrievalUri) => {
  unregisterSchema(retrievalUri);

  for (const retrievalUri in fixtures) {
    unregisterSchema(retrievalUri);
  }

  for (const retrievalUri in testCase.externalSchemas) {
    unregisterSchema(retrievalUri || testCase.externalSchemas[retrievalUri]?.$id || testCase.externalSchemas[retrievalUri]?.id);
  }
};
