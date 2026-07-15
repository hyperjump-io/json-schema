export const runTestSuite: (draft: number, dialectId: string, skip: Set<string>, testSuitePath?: string) => void;
export const isCompatible: (compatibility: string | undefined, versionUnderTest: number) => boolean;
