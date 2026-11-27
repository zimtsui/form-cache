import * as StreamConsumers from 'node:stream/consumers';
import * as Undici from 'undici';
import { parse, type RequestRangeError, type RequestSyntaxError, type RequestTypeError } from '@zimtsui/form-stream';
import { meter, type StreamSizeError } from '@zimtsui/form-stream/meter';
import { FileCache } from './file-cache.ts';
import { MIMEType, TextDecoder } from 'node:util';



/**
 * @throws {@link StreamSizeError}
 * @throws {@link RequestRangeError}
 * @throws {@link RequestSyntaxError}
 * @throws {@link RequestTypeError}
 * @throws {@link TypeError} Invalid request `Content-Type` header.
 */
export interface FormCache {
    (params: FormCache.Params): Promise<FormCache.Form>;
}
export namespace FormCache {
    export interface Options {
        maxTextEntrySizeByte?: number;
        fileCache: FileCache;
    }

    export function create({ fileCache, maxTextEntrySizeByte = 1024 * 1024 }: FormCache.Options): FormCache {
        return async ({
            bodyReadableStream,
            contentType,
            signal,
        }: FormCache.Params) => {
            await using ads = new AsyncDisposableStack();
            const entries: [string, Undici.FormDataEntryValue][] = [];
            const entryStream = parse(new MIMEType(contentType), bodyReadableStream, { signal });
            for await (const { name, filename, contentType: entryType, chunks } of entryStream) {
                if (filename !== undefined) {
                    const file = ads.use(await fileCache({
                        stream: chunks,
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
                    const bytes = await StreamConsumers.arrayBuffer(chunks.pipeThrough(meter(maxTextEntrySizeByte)));
                    entries.push([name, decoder.decode(bytes)]);
                }
            }
            return new FormCache.Form(ads, entries);
        };
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
