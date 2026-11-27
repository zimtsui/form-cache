import type { FileCache } from './file-cache.ts';
import { BlobCache } from './blob-cache.ts';
import { LocalBlobCache } from './local-blob-cache.ts';



export namespace LocalFileCache {
    export interface Options {
        tempDirPath: string;
    }

    export function create({ tempDirPath }: Options): FileCache {
        const localBlobCache = LocalBlobCache.create({ tempDirPath });

        return async ({
            fileReadableStream,
            fileName,
            mimeType,
            signal,
        }: FileCache.Params) => {
            await using ads = new AsyncDisposableStack();
            const blob = await localBlobCache({ fileReadableStream, mimeType, signal });
            ads.use(blob);
            return new LocalFileCache.File(ads, blob, fileName);
        };
    }

    export class File extends globalThis.File implements FileCache.File {
        protected ads: AsyncDisposableStack;

        /**
         * @param blob Ownership transferred
         */
        public constructor(
            ads: AsyncDisposableStack,
            protected blob: BlobCache.Blob,
            fileName: string,
        ) {
            super([blob], fileName, { type: blob.type });
            this.ads = ads.move();
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.ads.disposeAsync();
        }
    }

}
