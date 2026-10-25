# Reporting errors

`toVFileMessage` converts an error to a
[`VFileMessage`](https://github.com/vfile/vfile-message) with the message from
`outputErrorMessage`, to report it with unified tooling.

```javascript
import { toVFileMessage } from "@hyperjump/json-schema";

String(toVFileMessage(result.errors[0]));
// "1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'"
```
