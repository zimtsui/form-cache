import { StreamCache } from './stream-cache.ts';
import { BlobCache } from './blob-cache.ts';



export namespace LocalStreamCache {

    export function create(blobCache: BlobCache): StreamCache {
        return async (stream, signal) => {
            await using ads = new AsyncDisposableStack();
            const blob = ads.use(await blobCache({ stream, signal }));
            return new LocalStreamCache.Image(ads, blob);
        };
    }

    export class Image implements StreamCache.Image {
        protected ads: AsyncDisposableStack;

        public constructor(
            ads: AsyncDisposableStack,
            protected blob: BlobCache.Blob,
        ) {
            this.ads = ads.move();
        }

        public async retrieve(): Promise<ReadableStream<Uint8Array>> {
            return this.blob.stream();
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.ads.disposeAsync();
        }
    }

}
