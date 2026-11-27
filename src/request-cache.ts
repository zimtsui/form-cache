import * as Undici from 'undici';
import type { StreamCache } from './stream-cache.ts';
import { Readable } from 'node:stream';



export interface RequestCache {
    (request: Undici.Request, signal?: AbortSignal): Promise<RequestCache.Image>;
}

export namespace RequestCache {

    export function create(streamCache: StreamCache): RequestCache {
        return async (request) => {
            await using ads = new AsyncDisposableStack();
            if (request.body) {
                if (request.bodyUsed) throw new TypeError('Raw request body is required to be not used.');
                const image = ads.use(await streamCache(request.body, request.signal));
                return new RequestCache.Image(ads, request, image);
            } else
                return new RequestCache.Image(ads, request, null);
        }
    }

    export class Image implements AsyncDisposable {
        protected ads: AsyncDisposableStack;

        public constructor(
            ads: AsyncDisposableStack,
            protected request: Undici.Request,
            protected image: StreamCache.Image | null,
        ) {
            this.ads = ads.move();
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.ads.disposeAsync();
        }

        public async retrieve(): Promise<RequestCache.Request> {
            return new RequestCache.Request(this.request, this.image ? await this.image.retrieve() : null);
        }
    }

    /**
     * NOT subclass of Undici.Request
     */
    export class Request implements Undici.Request {

        public constructor(
            protected request: Undici.Request,
            public body: ReadableStream<Uint8Array> | null,
        ) {}

        public get bodyUsed(): boolean {
            return this.body ? Readable.isDisturbed(this.body) : false;
        }

        public get cache() {
            return this.request.cache;
        }

        public get credentials() {
            return this.request.credentials;
        }

        public get destination() {
            return this.request.destination;
        }

        public get duplex() {
            return this.request.duplex;
        }

        public get headers() {
            return this.request.headers;
        }

        public get integrity() {
            return this.request.integrity;
        }

        public get keepalive() {
            return this.request.keepalive;
        }

        public get method() {
            return this.request.method;
        }

        public get mode() {
            return this.request.mode;
        }

        public get redirect() {
            return this.request.redirect;
        }

        public get referrer() {
            return this.request.referrer;
        }

        public get referrerPolicy() {
            return this.request.referrerPolicy;
        }

        public get signal() {
            return this.request.signal;
        }

        public get url() {
            return this.request.url;
        }

        public blob() {
            return new Undici.Response(this.body, { headers: this.request.headers }).blob();
        }

        public arrayBuffer() {
            return new Undici.Response(this.body).arrayBuffer();
        }

        public text() {
            return new Undici.Response(this.body).text();
        }

        public json() {
            return new Undici.Response(this.body).json();
        }

        public bytes() {
            return new Undici.Response(this.body).bytes();
        }

        public formData() {
            return new Undici.Response(this.body, { headers: this.request.headers }).formData();
        }

        public textStream() {
            return new Undici.Response(this.body).textStream();
        }

        public clone(): RequestCache.Request {
            if (this.bodyUsed) throw new TypeError('Request body is required to be not used.');
            const [stream1, stream2] = this.body ? this.body.tee() : [null, null];
            this.body = stream1;
            return new RequestCache.Request(this.request, stream2);
        }
    }

}
