import { BlobCache } from './blob-cache.ts';


export interface FileCache {
    (params: FileCache.Params): Promise<FileCache.File>;
}

export namespace FileCache {
    export interface Params extends BlobCache.Params {
        fileName: string;
    }

    export interface File extends globalThis.File, AsyncDisposable {}
}
