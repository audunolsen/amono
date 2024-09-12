import { z } from "zod"
import * as Helpers from "@amono/outil/types"
import { coerceError } from "@amono/outil"
import type * as Concrete from "./types/concrete"
import type * as Generics from "./types/generics"
import { InterceptionHandler, type InterceptorEvent } from "./intercept"

/**
 * Simple HTTP client that wraps the native `fetch` API.
 *
 * Mostly type overhead to provide elegant DX through
 * autocomplete/type-hints, type information on hover,
 * go to definition and JSDoc.
 */
export class Liaison<
  const T extends Concrete.Config,
  U = undefined,
> extends InterceptionHandler {
  /**
   * A `Liaison` instance that this intance may
   * extend determined by the constructor
   */
  extends?: U

  /**
   * Partial config; only the config formed by what is explicitly
   * passed to the constructor, i.e. independent of any extends.
   */
  partial: T

  /**
   * Create a new `Liaison` instance
   *
   * Overload signature 1
   */
  constructor(config: T)

  /**
   * Create a new `Liaison` instance that extends an
   * existing instance
   *
   * Overload signature 2
   */
  constructor(extend: U, config: T | ((extend: U) => T))

  /**
   * Overload implementation
   */
  constructor(
    ...args: [config: T] | [extend: U, config: T | ((extend: U) => T)]
  ) {
    super()

    this.extends = args.length === 2 ? args[0] : undefined
    this.partial =
      args.length === 2
        ? typeof args[1] === "function"
          ? args[1](args[0])
          : args[1]
        : args[0]
  }

  /**
   * The entirety of the final config formed by what is
   * passed to the constructor AND any previous extends.
   */
  get config(): Helpers.Prettify<
    Generics.NormalizedConfig<Generics.MergeConfig<typeof this>>
  > {
    let ext: any = this.extends
    let opts: any = this.partial

    while (ext) {
      opts = { ...ext.partial, ...opts }
      ext = ext.extends
    }

    const keys = ["params", "body", "response"] satisfies Concrete.SchemaKeys[]

    for (const key of keys) {
      opts[key] ??= z.unknown()
      if (typeof opts[key] === "function") opts[key] = opts[key](z)
    }

    return opts
  }

  /**
   * Get the entire chain of extended instances, including current instance,
   * ordered from earliest extend to most recent in an object type.
   */
  get chain(): Generics.Meta.ExtensionObject<typeof this> {
    let current: any = this
    let instances: any[] = []

    while (current) {
      instances.push(current)
      current = current.extends
    }

    return instances.reverse().reduce<any>((a, e, i) => {
      a[`${i}-${e.partial.name ?? "unnamed"}`] = e
      return a
    }, {})
  }

  #getInterceptors<Event extends InterceptorEvent>(event: Event) {
    const chain = Object.values(this.chain)

    return Object.values(chain)
      .map(e => (isLiaison(e) ? e.interceptors[event] : []))
      .flat()
  }

  get #requestPipe() {
    return InterceptionHandler.createRequestPipe(
      this.#getInterceptors("request"),
    )
  }

  get #responsePipe() {
    return InterceptionHandler.createResponsePipe(
      this.#getInterceptors("response"),
    )
  }

  get #errorPipe() {
    return InterceptionHandler.createErrorPipe(this.#getInterceptors("error"))
  }

  /**
   * Types inferred from Zod-schemas passed to config
   */
  declare types: Generics.Meta.SchemaTypes<typeof this>

  /**
   * All fields that are allowed at call time. These are
   * mostly derived from previously established instance
   * config and uses the following heuristics:
   *
   * - No already defined fields unless explicitly marked as an override
   * - Input for any corresponding Zod-schemas
   * - Most config fields unless nonsensical to pass at calltime
   * - Config fields yet to be defined that are crucial for a network call
   *    - In principle that should only be the url.
   */
  private declare CallConfig: Helpers.Combine<
    [
      Concrete.Calltime.Config,
      Generics.Calltime.DisallowAlreadyDefined<typeof this>,
      Generics.Calltime.Overrides<typeof this>,
      Generics.Calltime.SchemaInputs<typeof this>,
      Generics.Calltime.RequireIfMissing<typeof this, "url">,
    ]
  >

  /**
   * Type of argument tuple for `go` and `safeGo`.
   *
   * A tuple is used because it facilitates a function signature
   * that conditionally may be without any argument(s).
   */
  private declare CallArgs: Helpers.HasRequiredFields<
    typeof this.CallConfig
  > extends true
    ? [requiredConfig: typeof this.CallConfig]
    : [optionalConfig?: typeof this.CallConfig]

  /**
   * interal method that runs native `fetch` under
   * the hood and handles everything from intercepting
   * to schema-parsing among other things
   */
  async #fetch(config?: typeof this.CallConfig) {
    const stack = getStack()
    const instanceConfig = <Concrete.NormalizedConfig>this.config
    const callConfig = <Concrete.Calltime.NormalizedConfig>(config ?? {})
    const callConfigOverrides = callConfig.override?.(instanceConfig)

    const {
      params: paramSchema,
      body: bodySchema,
      response: responseSchema,
      handleResponse,

      ...instanceConfigRest
    } = instanceConfig

    const {
      body: bodyInput,
      params: paramsInput,
      url: stringUrl = "somehow a missing URL found its way",

      ...nativeConfig
    } = {
      ...instanceConfigRest,
      ...callConfig,
      ...callConfigOverrides,
    }

    /**
     * If the formation of the final request object errors at
     * some point then we can use this to pass the latest
     * successfully (altough possibly incomplete) formed request
     * to the error interceptor to contextualise the error
     */
    let currentRequest = new Request(stringUrl, nativeConfig)

    const finalRequest = await Promise.all([
      paramSchema
        .pipe(baseParamSchema)
        .parseAsync(paramsInput, addErrorMap("URL params")),

      bodySchema.parseAsync(bodyInput, addErrorMap("Body")),
    ])
      .then(([params, body]) => {
        currentRequest = new Request(setUrlParams(stringUrl, params), {
          ...nativeConfig,
          body: body as never,
        })

        return currentRequest
      })
      .then(async req => (currentRequest = await this.#requestPipe(req, stack)))
      .catch(async err => {
        const coercedError = coerceError(err)
        throw await this.#errorPipe(
          coercedError,
          currentRequest,
          "request",
          stack,
        )
      })

    return fetch(finalRequest)
      .then(handleServerError)
      .then(res => this.#responsePipe(res, finalRequest))
      .then(handleResponse ?? unwrapRespone)
      .then(res => responseSchema.parseAsync(res, addErrorMap("Response")))
      .catch(async err => {
        const coercedError = coerceError(err)
        throw await this.#errorPipe(
          coercedError,
          finalRequest,
          "response",
          stack,
        )
      })
  }

  /**
   * Fire/Initiate the actual request
   */
  async go(
    ...[config]: typeof this.CallArgs
  ): Promise<Generics.Response<typeof this>> {
    return this.#fetch(config) as never
  }

  /**
   * Fire/Initiate the actual request and return error if any
   * as opposed to throwing on failure
   */
  async safeGo(
    ...[config]: typeof this.CallArgs
  ): Promise<Helpers.Prettify<Generics.SafeResponse<typeof this>>> {
    try {
      return [await this.#fetch(config), null] as never
    } catch (error) {
      return [null, coerceError(error)] as never
    }
  }
}

/**
 * This is appended through the `Liaison` instance's `params` schema
 * to enforce that said schema produces a value that can be
 * successfully serializable by the `URLSearchParams` API.
 */
const baseParamSchema = z
  .union(
    [z.undefined(), z.record(z.union([z.array(z.string()), z.string()]))],
    {
      errorMap: ({}, ctx) => ({
        message: `URL param schema must produce a value that can be serializable. (Record<string, string | string[]>) | ${ctx.defaultError}`,
      }),
    },
  )
  .transform(v => v ?? {})

/**
 * Append URL parameters to any valid RequstInfo; i.e.string, URL, Request, etc….
 * Returns a new Request object with appended parameters.
 * Supports multiple values of same key name.
 */
function setUrlParams(
  info: RequestInfo,
  params: Record<string, string | string[]>,
) {
  const req = new Request(info)
  const url = new URL(req.url)

  for (const [key, value] of Object.entries(params))
    for (const v of [value].flat()) url.searchParams.append(key, v)

  return new Request(url)
}

/**
 * This is a basic utility to unwrap response object
 * according to headers. Only handles `text` and `json`
 * which are the most typical cases.
 *
 * Use Liaison's `transformResponse` for more granular
 * control, e.g. when needing `.blob()` and such.
 */
export function unwrapRespone(response: Response) {
  const type = response.headers.get("content-type") ?? ""
  const unwrap = type.includes("application/json") ? "json" : "text"

  return response[unwrap]()
}

/**
 * Makes a non succesful status code catchable (outside 200-range).
 * Unwraps response to also output any server error message, if any.
 * If status is succesful, it will return response as is.
 */
async function handleServerError(res: Response) {
  if (res.ok) return res

  throw new Error(
    [
      `code: ${res.status}`,
      `type: ${res.type}`,
      `text: "${res.statusText}`,
      `server-response: ${await res.text()}`,
    ].join(", "),
  )
}

function isLiaison(value: unknown): value is Liaison<{}> {
  return value instanceof Liaison
}

/**
 * Add a small prefix to the errors of Zod schema's to better
 * identify what schema the error is accosiated with.
 */
function addErrorMap(schemaType: string): Partial<z.ParseParams> {
  return {
    errorMap: ({}, ctx) => ({
      message: `${schemaType} schema | ${ctx.defaultError}`,
    }),
  }
}

/**
 * Get the call stack at any arbitrary point in the code execution
 * https://stackoverflow.com/questions/6715571/how-to-get-result-of-console-trace-as-string-in-javascript-with-chrome-or-fire
 * https://stackoverflow.com/questions/69219706/chrome-automatically-formats-error-stacks-how-does-this-work
 *
 * @note `stack` is non standard but supported in all
 * major JavaScript engines. There is work to standardise
 * it, so this function can proably be revised in the future.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack
 *
 * Because it is non standardised, different engines may report
 * the stack differently; i.e the exact position of the relevant
 * call-site may vary. For this reason it is easier to just default to
 * displaying a small portion of the stack instead of trying
 * to find the exact entry.
 *
 * @note This is intended as a fallback in case
 * a console warn/error isn't able to show enough
 * frames to trace back to the initiaton of the network call
 */
function getStack(start = 3, end = 5) {
  return new Error().stack
    ?.split("\n")
    .splice(start, end)
    .map(e => e.trim())
    .join("\n")
}
