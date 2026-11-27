# form-cache

[![NPM Version](https://img.shields.io/npm/v/@zimtsui/form-cache?style=flat-square)](https://www.npmjs.com/package/@zimtsui/form-cache)

## Requirements

-   GNU Core Utilities

## Compromises

-   Only ASCII is supported for `multipart/form-data` form charset. Refer to [`@zimtsui/form-stream`](https://github.com/zimtsui/form-stream) for all compromises about `multipart/form-data` parsing.
-   `FormCache.Form` is a subclass of `Undici.FormData` instead of global `FormData`.
