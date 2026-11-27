
export interface StreamCache {
    (stream: ReadableStream<Uint8Array>, signal?: AbortSignal): Promise<StreamCache.Storage>;
}

export namespace StreamCache {
    export interface Storage extends AsyncDisposable {
        retrieve(): Promise<ReadableStream<Uint8Array>>;
    }
}
