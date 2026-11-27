
export interface StreamCache {
    (stream: ReadableStream<Uint8Array>, signal?: AbortSignal): Promise<StreamCache.Image>;
}

export namespace StreamCache {
    export interface Image extends AsyncDisposable {
        retrieve(): Promise<ReadableStream<Uint8Array>>;
    }
}
