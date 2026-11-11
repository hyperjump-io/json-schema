export const runTestSuite: (draft: number, dialectId: string, skip: Set<string>, options?: TestSuiteOptions) => void;
export const isCompatible: (compatibility: string | undefined, versionUnderTest: number) => boolean;

export type TestSuiteOptions = {
  testSuitePath?: string;
  include?: string | string[];
  exclude?: string[];
  tags?: Set<string>;
};
