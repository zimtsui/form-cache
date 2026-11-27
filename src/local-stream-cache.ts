import { createReadStream, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import { StreamCache } from './stream-cache.ts';
import { open } from 'node:fs/promises';




export namespace LocalStreamCache {
    export interface Options {
        tempDirPath: string;
    }

    export function create(options: Options): StreamCache {
        return async ({
            fileReadableStream,
            signal,
        }: StreamCache.Params) => {
            await using ads = new AsyncDisposableStack();
            const tempFilePath = execFileSync('mktemp', ['-p', resolve(options.tempDirPath)], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
            ads.defer(() => unlinkSync(tempFilePath));
            await using fd = await open(tempFilePath, 'w');
            await fileReadableStream.pipeTo(Writable.toWeb(fd.createWriteStream()), { signal });
            return new LocalStreamCache.Retriever(ads, tempFilePath);
        };
    }

    export class Retriever implements StreamCache.Retriever {
        protected ads: AsyncDisposableStack;

        public constructor(
            ads: AsyncDisposableStack,
            protected tempFilePath: string,
        ) {
            this.ads = ads.move();
        }

        public retrieve(): ReadableStream {
            return Readable.toWeb(createReadStream(this.tempFilePath), { strategy: { size(chunk: Uint8Array) { return chunk.byteLength; } } });
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.ads.disposeAsync();
        }
    }

}
