import type { MIMEType } from 'node:util';


export interface BlobCache {
    (params: BlobCache.Params): Promise<BlobCache.Blob>;
}

export namespace BlobCache {
    export interface Params {
        fileReadableStream: ReadableStream;
        mimeType?: MIMEType;
        signal?: AbortSignal;
    }

    export interface Blob extends globalThis.Blob, AsyncDisposable {}
}
