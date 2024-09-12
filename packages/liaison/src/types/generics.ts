import * as Helpers from "@amono/outil/types"
import type * as Concrete from "./concrete"

/**
 * ---
 * Collection of generic types specific to `Liaison`
 *
 * @note
 * `T` usually equates to `typeof this` of a `Liaison`
 * instance for most type utilites. It doesn't explicitly
 * extend said type to pacify TS a bit.
 * ---
 */

/**
 * Retrieve a schema type from generic,
 * returns either schema returned from callback,
 * schema directly or a fallback schema type.
 */
export type FinalizeSchema<T> = T extends Concrete.CreateSchema
  ? ReturnType<T>
  : T extends Concrete.Schema
    ? T
    : Concrete.Schema

/**
 * Returns input or output type inferred from schema.
 * If invalid generic type will default to unknown.
 */
export type FinalSchemaType<
  T,
  Mode extends "input" | "output" = "output",
> = Mode extends "input"
  ? Zod.input<FinalizeSchema<T>>
  : Zod.output<FinalizeSchema<T>>

/**
 * Mirrors `Concrete.NormalizedConfig` but as a generic
 * type with awareness of `Liaison` instance generic type data.
 *
 * any Zod-schemas are resolved as schemas
 * directly and instead of callbacks.
 */
export type NormalizedConfig<T> = {
  [K in keyof T]: K extends Concrete.SchemaKeys ? FinalizeSchema<T[K]> : T[K]
}

/**
 * Create a flat object type of all configs defined
 * through a `Liaison` instance's extension stack.
 */
export type MergeConfig<T> = T extends { partial: infer P; extends?: infer E }
  ? Helpers.Override<MergeConfig<E>, P>
  : {}

/**
 * Type of response inferred from `response` schema from instance config
 */
export type Response<T> = FinalSchemaType<
  Helpers.Lookup<T, ["config", "response"]>
>

/**
 * Wraps response in a tuple typed in a manner such that
 * if error is checked for, then that will narrow the
 * response to its actual value or null based on
 * the presense of an error.
 *
 * Inspired by the very popular ECMAScript proposal
 * https://github.com/arthurfiorette/proposal-safe-assignment-operator
 */
export type SafeResponse<T> =
  | [response: Response<T>, error: null]
  | [response: null, error: Error]

/**
 * Generic types used to contextualise what is allowed
 * to be passed at call time when making a network call determined
 * by current data of the instance
 *
 * @note
 * it is limiting the API to try and create typed relationships
 * between fields in the same object declaration. For this
 * reason the call site should only consume generic type information
 * and not be able to create any.
 */
export namespace Calltime {
  export type Overrides<T, $conf = Helpers.Lookup<T, ["config"]>> = {
    /**
     * Enforce an explicit API where already defined fields cannot
     * be passed unless explicitly stated as an override
     */
    override?:
      | Concrete.Config
      | ((config: NormalizedConfig<$conf>) => Concrete.Calltime.Config)
  }

  /**
   * Fields that are already defined and should not be passed at call time.
   * Support go to definition to easily find the origin of said field.
   */
  export type DisallowAlreadyDefined<
    T,
    $conf = Helpers.Lookup<T, ["config"]>,
  > = Partial<{
    [K in keyof $conf]: Helpers.Warning<`${Helpers.ToString<K>} already defined; ${Helpers.ToString<$conf[K], "value not representable as a string">}>}`>
  }>

  /**
   * This just validates keys are derived from config, making it easier
   * to spot if union goes out of sync during refactoring.
   */
  type InputSchemas = keyof Pick<Concrete.Config, "params" | "body">

  /**
   * Maps provided keys to Zod inferred schema types
   * previously defined by a `Liaison` instance. These
   * are fields are referenced at call time to supply input
   * values to the network call.
   */
  export type SchemaInputs<T, $conf = Helpers.Lookup<T, ["config"]>> = {
    [K in keyof Helpers.SafePick<$conf, InputSchemas>]: FinalSchemaType<
      $conf[K],
      "input"
    >
  }

  /**
   * Creates object with required field
   * based the targeted key (K) that is
   * missing from generic T.
   *
   s* @note This only works with explicit keys, not union keys
   */
  export type RequireIfMissing<T, K extends keyof Concrete.Config> =
    Helpers.Lookup<T, ["config", K]> extends null
      ? Required<Pick<Concrete.Config, K>>
      : {}
}

/**
 * Types that are not crucial for any actual network calls but
 * makes for easy referening of types/config/instances, etc…
 */
export namespace Meta {
  /**
   * Create an object that extracts all schema fields from
   * `Liaison` instance and map shcemas to their respective inferred types.
   *
   * Uses mapped type to preserve go to definiton.
   */
  export type SchemaTypes<
    T,
    $conf = Helpers.Lookup<T, ["config"]>,
  > = Helpers.Prettify<{
    [K in keyof Helpers.SafePick<
      $conf,
      Concrete.SchemaKeys
    >]: K extends keyof Pick<Concrete.Config, "params" | "body">
      ? FinalSchemaType<$conf[K], "input">
      : FinalSchemaType<$conf[K]>
  }>

  /**
   * Tuple type of all the `Liaison` instances that have
   * been chained together through extensions sorted by recency.
   */
  export type ExtensionTuple<T> = [
    T,
    ...(T extends { extends?: infer U }
      ? U extends undefined
        ? []
        : ExtensionTuple<U>
      : []),
  ]

  /**
   * Object type of all the `Liaison` instances that have
   * been chained together through extensions. Object fields
   * are named using index and config `name` field (if any)
   * to easily see the order of extensions
   */
  export type ExtensionObject<
    T,
    $obj = Helpers.ObjectFromTuple<Helpers.ReverseTuple<ExtensionTuple<T>>>,
  > = Helpers.Prettify<{
    [K in keyof $obj as $obj[K] extends infer U
      ? `${Helpers.ToString<K>}-${Helpers.Lookup<U, ["partial", "name"], ["filter", string, "unnamed"]>}`
      : K]: $obj[K]
  }>
}
