import { pathRelative } from "./common";
import { expect } from "chai";


const relativeTests = [
  ["/", "/var/lib", "var/lib"],
  ["/foo/test", "/foo/test/bar/package.json", "bar/package.json"],
  ["/var/lib", "/var", ".."],
  ["/var/lib", "/bin", "../../bin"],
  ["/var/lib", "/var/lib", ""],
  ["/var/lib", "/var/apache", "../apache"],
  ["/Users/a/web/b/test/mails", "/Users/a/web/b", "../.."],
  ["/foo/bar/baz-quux", "/foo/bar/baz", "../baz"],
  ["/foo/bar/baz", "/foo/bar/baz-quux", "../baz-quux"],
  ["/baz-quux", "/baz", "../baz"],
  ["/baz", "/baz-quux", "../baz-quux"],
  ["/page1/page2/foo", "/", "../../.."]
];

describe("path.relative", () => {
  relativeTests.forEach((test) => {
    it(`${test[1]} relative to ${test[0]}`, () => {
      const subject = pathRelative(test[0], test[1]);
      expect(subject).to.equal(test[2]);
    });
  });
});
