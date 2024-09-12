import type { Prettify } from "@amono/outil/types"

export class InterceptionHandler {
  interceptors: Interceptors = {
    request: [],
    response: [],
    error: [],
  }

  /**
   * Add an Interceptor to network calls;
   * - Before request is made
   * - After response is recieved
   * - Error at any stage of the network call
   *
   * Can help mitigate repeated error handling and repeated
   * logic for e.g. setting auth before a request is made.
   *
   * @example
   * ```ts
   * instance.addInterceptor('error', async (error, request) => {
   *  console.log(`Endpoint ${request.url} failed`, Error.message)
   *  return error;
   * })
   * ```
   */
  addInterceptor = <Event extends keyof CallbackMap>(
    event: Event,
    callback: CallbackMap[Event],
    options: InterceptorOptions = {},
  ) => {
    this.interceptors[event].push(callback)
    options.signal?.addEventListener(
      "abort",
      () => {
        const index = this.interceptors[event].indexOf(callback)
        this.interceptors[event].splice(index, 1)
      },
      { once: true },
    )
  }

  /**
   * Static helper method that takes an array of
   * interceptor callbacks of the same type
   * and return a single function with the same signature
   * that runs the entire pipeline of intercepors.
   */

  /** */

  static createErrorPipe(
    cbs: Array<CallbackMap["error"]>,
  ): CallbackMap["error"] {
    return (acc, ...ctx) =>
      cbs.reduce(async (a, e) => e(await a, ...ctx), Promise.resolve(acc))
  }

  static createRequestPipe(
    cbs: Array<CallbackMap["request"]>,
  ): CallbackMap["request"] {
    return (acc, ...ctx) =>
      cbs.reduce(async (a, e) => e(await a, ...ctx), Promise.resolve(acc))
  }

  static createResponsePipe(
    cbs: Array<CallbackMap["response"]>,
  ): CallbackMap["response"] {
    return (acc, ...ctx) =>
      cbs.reduce(async (a, e) => e(await a, ...ctx), Promise.resolve(acc))
  }
}

/**
 * Options for when adding Interceptors.
 *
 * @example
 * ```typescript
 * retrieve.addInterceptor("error", fn, options)
 * //                                     -^-
 * ```
 */
export type InterceptorOptions = {
  /**
   * This utilises the modern pattern for removing event listeners.
   * Native addEventListers now supports abort controllers which is a far
   * more ergonomic approach than removing listeners by callback reference.
   */
  signal?: AbortSignal
}

/**
 * Function signatures of the respective inteceptor events.
 * The first argument is the "accumulator" value that may
 * be updated, affecting the actual behaviour of the network call.
 *
 * Any potential other arguments are for context, e.g. when intercepting
 * an error you can use `Request` object to show other contextual information
 * like the url.
 */
interface CallbackMap {
  request(request: Request, callStack?: string): Promise<Request>

  response(
    response: Response,
    request: Request,
    callStack?: string,
  ): Promise<Response>

  error(
    error: Error,
    request: Request,
    when: "request" | "response",
    callStack?: string,
  ): Promise<Error>
}

type Interceptors = { [K in keyof CallbackMap]: Array<CallbackMap[K]> }
export type InterceptorEvent = Prettify<keyof Interceptors>
