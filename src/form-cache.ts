import * as StreamConsumers from 'node:stream/consumers';
import * as Undici from 'undici';
import { parse } from '@zimtsui/form-stream';
import { meter, type SizeOutOfRangeError } from '@zimtsui/form-stream/meter';
import { FileCache } from './file-cache.ts';
import { MIMEType, TextDecoder } from 'node:util';



export class FormCache {
    protected fileCache: FileCache;
    protected maxTextEntrySizeByte: number;

    public constructor({ fileCache, maxTextEntrySizeByte = 1024 * 1024 }: FormCache.Options) {
        this.fileCache = fileCache;
        this.maxTextEntrySizeByte = maxTextEntrySizeByte;
    }

    public async save({
        bodyReadableStream,
        contentType,
        signal,
    }: FormCache.Params): Promise<FormCache.Form> {
        await using ads = new AsyncDisposableStack();
        const entries: [string, Undici.FormDataEntryValue][] = [];
        const entryStream = parse(new MIMEType(contentType), bodyReadableStream, { signal });
        for await (const { name, filename, contentType: entryType, chunks } of entryStream) {
            if (filename !== undefined) {
                const file = ads.use(await this.fileCache({
                    fileReadableStream: chunks,
                    fileName: filename,
                    mimeType: entryType ?? new MIMEType('text/plain'),
                    signal,
                }));
                entries.push([name, file]);
            } else {
                const charset = entryType?.params.get('charset') ?? 'utf-8';
                const decoder = (() => {
                    try {
                        return new TextDecoder(charset, { ignoreBOM: true });
                    } catch (error) {
                        if (error instanceof RangeError)
                            throw new SyntaxError(`Unsupported charset for multipart field ${name}.`, { cause: error });
                        else throw error;
                    }
                })();
                const bytes = await StreamConsumers.arrayBuffer(chunks.pipeThrough(meter(this.maxTextEntrySizeByte)));
                entries.push([name, decoder.decode(bytes)]);
            }
        }
        return new FormCache.Form(ads, entries);
    }
}


export namespace FormCache {
    export interface Options {
        maxTextEntrySizeByte?: number;
        fileCache: FileCache;
    }

    export interface Params {
        bodyReadableStream: ReadableStream<Uint8Array>;
        contentType: string;
        signal?: AbortSignal;
    }

    export class Form extends Undici.FormData implements AsyncDisposable {
        protected ads: AsyncDisposableStack;

        public constructor(
            ads: AsyncDisposableStack,
            entries: [string, Undici.FormDataEntryValue][],
        ) {
            super();
            for (const [name, value] of entries) this.append(name, value);
            this.ads = ads.move();
        }

        public async [Symbol.asyncDispose]() {
            await this.ads.disposeAsync();
        }
    }
}
