import * as Helpers from "@amono/outil/types"
import type Zod from "zod"

export interface Config extends Omit<RequestInit, "method" | "body"> {
  /**
   * Provide a name for the instance to e.g. better identify it on
   * intellisense hover. Useful when inspecting a larger chain
   * of extends or just accociating a name with an andpoint
   * that has a non descriptive url. Not used for any part
   * of any actual request.
   */
  name?: string

  /**
   * Function returning a Zod-schema. Determines type of `body` at call time.
   * Incitivices better typing, autocomplete and not sending unsanitized
   * data across the wire and not spam endpoints w/ invalid payloads.
   */
  body?: CreateSchema

  /**
   * Function returning a Zod-schema. Determines type of `body` at call time.
   * Incitivices better typing, autocomplete and not sending unsanitized
   * data across the wire and not spam endpoints w/ invalid payloads.
   */
  params?: CreateSchema

  /**
   * Function returning a Zod-schema. Validates data and determines retrun type of the HTTP call.
   * Ensures that there won't be schema drifts where successful network call results
   * in mismatched runtime data and static types creating hard to debug uncaught errors.
   */
  response?: CreateSchema

  /**
   * Request url that will be passed to Fetch' first `input` argument, but
   * always as a string, never a `Request` object.
   *
   * The reason for this is so that the url is always easily readable
   * on Intellisense-hover and otherwise easy referencing elsewhere
   */
  url?: string

  /**
   * A string to set request's method
   *
   * Uses a loose union type that provides type-hints
   * for standardised methods while accepting any
   * abritrary string — staying fetch compliant.
   */
  method?: LooseMethod

  /**
   * For full control over response object from the native fetch, this is
   * seldom needed unless you need to parse the response with other
   * unwrapping methods as e.g. `blob()`, reference response headers
   * or just use of the `body` stream directly
   */
  handleResponse?: (response: Response) => Promise<unknown>
}

/**
 * All fields in the `Config` which may hold Zod schemas.
 *
 * @note Uses pick to enforce typed relationship between union and
 * config, such that anyt possible future refactorings are safer
 */
export type SchemaKeys = keyof Pick<Config, "body" | "response" | "params">

/**
 * Mirrors `Generics.NormalizedConfig` but as a concrete
 * type, has no awareness of Generic type data
 */
export interface NormalizedConfig
  extends Omit<Config, keyof Pick<Config, SchemaKeys>> {
  body: Schema
  params: Schema
  response: Schema
}

/**
 * Base Zod schema type, serves two purposes;
 * - The widest possible base schema type that generics may extend
 * - A fallback for any missing schemas so that any zod inferring defaults to "unknown"
 */
export type Schema = Zod.ZodType<unknown>

/**
 * Form a schema from a callback function
 */
export type CreateSchema = (z: typeof Zod) => Schema

/**
 * All standardised methods as documented by MDN
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods.
 *
 * Native fetch' types method as string, which is not particularly helpful.
 */
export type Method =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH"

/**
 * Any string AND standardised methods as documented by MDN
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods.
 *
 * This is spec compliant w/ fetch (custom or legacy HTTP methods, etc…)
 * while still supporting type hints for standardised methods.
 */
export type LooseMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH"
  | (string & {})

/** Alias to avoid circular Calltime Config definition error */
type InstanceConf = Config
type NormalizedInstanceConf = NormalizedConfig

export namespace Calltime {
  /**
   * @todo notes
   *
   * @note some `SchemaKeys` are techically passed at calltime, altough
   * just not with the same type as the base `Config` hence they
   * should be handled through a different generic type helper.
   *
   * @note `body` should default to the type of Native `fetch` unless
   * it is determined by a Zod schema. Conditional overwriting
   * of `body` should be handled by another generic type helper
   */
  export type Config = Helpers.Combine<
    [
      Omit<
        InstanceConf,
        keyof Pick<InstanceConf, SchemaKeys | "name" | "handleResponse">
      >,
      Pick<RequestInit, "body">,
    ]
  >

  /**
   * @todo notes
   */
  export interface NormalizedConfig
    extends Omit<
      InstanceConf,
      keyof Pick<InstanceConf, SchemaKeys | "name" | "handleResponse">
    > {
    body?: unknown
    params?: unknown
    override?: (config: NormalizedInstanceConf) => NormalizedConfig
  }
}

/**
 * @note
 * Some people may be peeved by certain config keys having repeated prefixed
 * like in the case of all the `define` prefixes in the `Config` type.
 * The reason a nested object under the repeated prefix is *not* utilised
 * like suggested by this popular tweet https://x.com/housecor/status/1803410168232677667
 * is that it makes instance extensions more confusing and annoying. Instance extensions
 * are SHALLOW merged. Nested merging is opt in with the callback function. This means
 * that important config options are best as top level keys.
 *
 * @note
 * `define` is no good. This solution prides itself on go to definiton
 * and referencing a finalised schema through e.g. `defineBody` does not
 * make sense. Hopefully fixed throug https://github.com/microsoft/TypeScript/issues/50715
 *
 *
 */
