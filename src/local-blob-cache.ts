import { openAsBlob, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import type { BlobCache } from './blob-cache.ts';
import { open } from 'node:fs/promises';



export namespace LocalBlobCache {
    export interface Options {
        tempDirPath: string;
    }

    export function create(options: Options): BlobCache {
        return async ({
            fileReadableStream,
            mimeType,
            signal,
        }: BlobCache.Params) => {
            await using ads = new AsyncDisposableStack();
            const tempFilePath = execFileSync('mktemp', ['-p', resolve(options.tempDirPath)], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
            ads.defer(() => unlinkSync(tempFilePath));
            await using fd = await open(tempFilePath, 'w');
            await fileReadableStream.pipeTo(Writable.toWeb(fd.createWriteStream()), { signal });
            return new LocalBlobCache.Blob(ads, await openAsBlob(tempFilePath, { type: mimeType?.toString() }));
        };
    }

    export class Blob extends globalThis.Blob implements BlobCache.Blob {
        protected ads: AsyncDisposableStack;

        public constructor(
            ads: AsyncDisposableStack,
            blob: globalThis.Blob,
        ) {
            super([blob], { type: blob.type });
            this.ads = ads.move();
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.ads.disposeAsync();
        }
    }

}
