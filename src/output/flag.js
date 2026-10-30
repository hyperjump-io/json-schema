/**
 * @import { OutputFormat } from "./output-format.d.ts"
 */

/**
 * Only whether the instance is valid. It's a plain boolean rather than an
 * object, so the fastest path doesn't allocate anything. It's the default,
 * and evaluation doesn't call it, so it never loads what the other formats
 * need.
 *
 * @type OutputFormat<boolean>
 */
export const FLAG = () => ({ output: (valid) => valid });
