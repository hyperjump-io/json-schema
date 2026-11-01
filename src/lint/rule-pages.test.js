import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { v1Dialect } from "../dialects/v1/index.js";
import { draft04Dialect } from "../dialects/draft-04/index.js";
import { draft06Dialect } from "../dialects/draft-06/index.js";
import { draft07Dialect } from "../dialects/draft-07/index.js";
import { draft201909Dialect } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import recommended from "./recommended.js";

/**
 * @import { Plugin } from "unified"
 */

// Each rule's page in website/linting/rules/ is checked against the rule,
// so they don't drift apart: its examples are linted the way the site
// renders them (hyperjump.io's expressive-code-json-schema.js), with every
// dialect, nothing retrieved, and the same URI.

const pagesUrl = new URL("../../website/linting/rules/", import.meta.url);
const rulesUrl = new URL("./rules/", import.meta.url);

const ruleNames = readdirSync(rulesUrl)
  .filter((name) => name.endsWith(".js") && !name.endsWith(".test.js"))
  .map((name) => name.slice(0, -".js".length))
  .sort();

const readme = readFileSync(new URL("README.md", pagesUrl), "utf8");

const jsonSchema = new JsonSchema({ dialects: [v1Dialect, draft04Dialect, draft06Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect] });

/**
 * @typedef {{
 *   section: "Reported" | "Not reported";
 *   title: string;
 *   code: string;
 *   dialectUri: string | undefined;
 *   messages: string[];
 * }} Example
 */

/**
 * The `json` examples on a page, with the messages in the blockquote after
 * each one
 *
 * @type (source: string) => Example[]
 */
const examples = (source) => {
  const lines = source.split("\n");
  /** @type Example[] */
  const found = [];
  /** @type Example["section"] | undefined */
  let section;
  let title = "";
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line === "### Reported" || line === "### Not reported") {
      section = /** @type Example["section"] */ (line.slice("### ".length));
    } else if (line.startsWith("#### ")) {
      title = line.slice("#### ".length);
    } else if (line.startsWith("```json") && section !== undefined) {
      const dialectUri = /\bdialect=(\S+)/.exec(line)?.[1];
      const code = [];
      for (index++; lines[index] !== "```"; index++) {
        code.push(lines[index]);
      }

      let next = index + 1;
      while (lines[next] === "") {
        next++;
      }
      const messages = [];
      for (; lines[next]?.startsWith(">"); next++) {
        if (lines[next].startsWith("> ")) {
          messages.push(lines[next].slice("> ".length));
        }
      }

      found.push({ section, title, code: code.join("\n"), dialectUri, messages });
    }
  }
  return found;
};

/**
 * What a rule reports for an example. Problems with the schema, like
 * draft-04's duplicate `enum` values, aren't the rule's.
 *
 * @type (name: string, rule: Plugin, example: Example) => Promise<string[]>
 */
const lint = async (name, rule, { code, dialectUri }) => {
  const file = new VFile(code);
  const processor = unified()
    .use(rejsonParse, { accept: "recovered" })
    .use(jsonSchemaResolve, {
      session: jsonSchema.session({ allowRetrieval: [] }),
      uri: "https://example.com/schema.json",
      ...dialectUri && { dialectUri }
    })
    .use(rule);
  await processor.run(processor.parse(file), file);
  return file.messages.filter((message) => message.ruleId === name).map((message) => message.reason);
};

/**
 * The severity a rule has in `recommended`
 *
 * @type (rule: Plugin) => string | undefined
 */
const recommendedSeverity = (rule) => {
  const entry = recommended.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === rule);
  if (!Array.isArray(entry)) {
    return undefined;
  }
  const [severity] = /** @type [string] */ (entry[1]);
  return severity === "error" ? "an error" : "a warning";
};

describe("rule pages", () => {
  for (const name of ruleNames) {
    describe(name, () => {
      const pageUrl = new URL(`${name}.md`, pagesUrl);
      const source = existsSync(pageUrl) ? readFileSync(pageUrl, "utf8") : "";

      test("has a page", () => {
        expect(existsSync(pageUrl)).to.equal(true);
      });

      test("has a row in the README", () => {
        expect(readme).to.include(`| [\`${name}\`](${name}.md) |`);
      });

      test("says its severity in recommended", async () => {
        const rule = (await import(new URL(`${name}.js`, rulesUrl).href)).default;
        const severity = recommendedSeverity(rule);
        expect(severity, "it's in recommended").to.not.equal(undefined);
        expect(source).to.include(`In \`recommended\`, as ${severity}.`);
      });

      test("has examples of both", () => {
        const sections = new Set(examples(source).map(({ section }) => section));
        expect([...sections].sort()).to.eql(["Not reported", "Reported"]);
      });

      for (const example of examples(source)) {
        test(`${example.section}: ${example.title}`, async () => {
          const rule = (await import(new URL(`${name}.js`, rulesUrl).href)).default;
          if (example.section === "Reported") {
            expect(example.messages, "the page lists messages").to.not.eql([]);
          } else {
            expect(example.messages, "the page lists no messages").to.eql([]);
          }
          expect((await lint(name, rule, example)).sort()).to.eql([...example.messages].sort());
        });
      }
    });
  }
});
