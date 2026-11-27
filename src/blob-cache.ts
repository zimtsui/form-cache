import type { MIMEType } from 'node:util';


export interface BlobCache {
    (params: BlobCache.Params): Promise<BlobCache.Blob>;
}

export namespace BlobCache {
    export interface Params {
        stream: ReadableStream<Uint8Array>;
        mimeType?: MIMEType;
        signal?: AbortSignal;
    }

    export interface Blob extends globalThis.Blob, AsyncDisposable {}
}
