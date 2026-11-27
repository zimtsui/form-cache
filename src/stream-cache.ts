
export interface StreamCache {
    (params: StreamCache.Params): Promise<StreamCache.Retriever>;
}

export namespace StreamCache {
    export interface Retriever extends AsyncDisposable {
        retrieve(): ReadableStream;
    }

    export interface Params {
        fileReadableStream: ReadableStream;
        signal?: AbortSignal;
    }
}
