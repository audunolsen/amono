/**
 * TypeScript will resolve an intersection that includes
 * duplicate keys to `never`. https://github.com/microsoft/TypeScript/pull/36696
 *
 * This instead overwrites any colliding
 * key with the latter `With`'s type
 */
export type Override<What, With> = Prettify<
  Fallback<Omit<What, keyof With> & With, {}>
>

/**
 * TypeScript will resolve an intersection that includes
 * duplicate keys to `never`. https://github.com/microsoft/TypeScript/pull/36696
 *
 * This instead overwrites any colliding
 * key with type of the latest entry in the
 * Generic type argument tuple.
 *
 * @note this was previously named `OverrideMultiple`
 * but that name was really verbose…
 */
export type Combine<T extends any[]> = Prettify<
  T extends [infer First, ...infer Rest]
    ? Rest extends any[]
      ? Override<First, Combine<Rest>>
      : First
    : {}
>

// type Test1 = OverrideMultiple<
//   [{ lorem: 1 }, { lorem: 2; ipsum: 4 }, { lorem: 3 }]
// >

/**
 * Flatten/Prettify the language-server's display type
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Provide a fallback for falsy/nullish/unknown types
 */
export type Fallback<T, U> = [T] extends [false | null | undefined | never]
  ? U
  : unknown extends T
    ? U
    : T

/**
 * Boolean determined by if key is present in object
 */
export type Has<T, K> = K extends keyof T ? true : false

// /**
//  * Type helper to more succinctly get type of property from
//  * generic which is an assumed object
//  *
//  * ```ts
//  * // Without helper
//  * type User = 'user' extends keyof T
//  *  ? T['user']
//  *  : {}
//  *
//  * // With helper
//  * type User = Lookup<T, 'user'>
//  * ```
//  */
// export type Lookup<
//   T,
//   K extends string | undefined = undefined,
//   // Determine what should be returned on a failed lookup
//   OnFalse extends
//     | "empty-object"
//     | "error-object"
//     | "error-string"
//     | undefined = undefined,
// > = K extends keyof T
//   ? T[K]
//   : OnFalse extends "empty-object"
//     ? {}
//     : OnFalse extends "error-object"
//       ? { __error: `${K} not found` }
//       : OnFalse extends "error-string"
//         ? `${K} not found`
//         : undefined

// /**
//  * Lookup value from unconstrained generic T
//  * and only return if it is the targeted primitive type
//  */
// export type LookupPrimitive<
//   T,
//   K extends string,
//   P extends "string" | "number" = "string",
// > = K extends keyof T
//   ? T[K] extends (P extends "string" ? string : number)
//     ? T[K]
//     : `Error(LookupPrimitive): '${K}' matched value but does not extend targeted primitive '${P}'`
//   : `Error(LookupPrimitive): '${K}' did not match any value`

/**
 * Use branded type to create a typed intellisense warning
 */
export type Warning<Reason extends string> =
  | (string & {
      warning: Reason
    })
  | undefined

/**
 * Wraps value in a discrimanted union. `ok` field which discriminates w/ either error
 * or value. Useful in functions that are prone to throwing exceptions
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

/**
 * Alternative to builtin `Pick` type helper for when
 * T and K types aren't related. Should retain go to definition
 */
export type SafePick<T, K extends string> = Pick<T, Extract<K, keyof T>>

/**
 * Strip any required fields from generic T
 */
export type StripRequiredFields<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K]
}

/**
 * Strip any optional fields from generic T
 */
export type StripOptionalFields<T> = Omit<T, keyof StripRequiredFields<T>>

/**
 * Check if generic T has any properties
 */
export type HasKeys<T> = keyof T extends never ? false : true

/**
 * Check if generic T has any required fields
 */
export type HasRequiredFields<T> = HasKeys<StripOptionalFields<T>>

/**
 * Get property from generic that may be deeply nested
 *
 * Supprts an "Options" tuple that can be used to provide
 * a type filter or a fallback value.
 *
 * In case of a filter, type will evaluate the most literal
 * type that is found, or fallback to the targeted filter type(s).
 *
 * In case of a fallback, it will evaluate to whatever is found
 * or the given fallback type otherwise.
 */
export type Lookup<
  T,
  K extends string[],
  Options extends
    | [behaviour: "filter", type: any, fallback?: any]
    | [behaviour: "fallback", fallback: any] = ["fallback", null],
> = K extends [infer First, ...infer Rest]
  ? First extends keyof T
    ? Rest extends string[]
      ? Lookup<T[First], Rest, Options>
      : Options[0] extends "filter"
        ? Fallback<Options[2], Options[1]>
        : Options[1]
    : Options[0] extends "filter"
      ? Fallback<Options[2], Options[1]>
      : Options[1]
  : Options[0] extends "filter"
    ? T extends Options[1]
      ? T
      : Fallback<Options[2], Options[1]>
    : T

type Stringable = string | number | bigint | boolean | null | undefined

/**
 *
 */
export type ToString<T, UnstringableFallback = ""> = T extends Stringable
  ? `${T}`
  : UnstringableFallback

/**
 * Reverse a tuple type
 */
export type ReverseTuple<T> = T extends [infer First, ...infer Rest]
  ? [...ReverseTuple<Rest>, First]
  : []

/**
 * Create an object from a tuple naming the
 * object fields after tuple items' indices.
 *
 * https://stackoverflow.com/questions/69085499/typescript-convert-tuple-type-to-object
 */
export type ObjectFromTuple<T> = Omit<T, keyof any[]>

// type Match<T, M extends [any, string][]> =
//   M extends [infer First, ...infer Rest]
//     ? First extends [infer Key, infer Value]
//       ? T extends Key
//         ? Value
//         : Match<T, Rest>
//       : never
//     : never;

// type PrimitiveMatcher<T, M extends [Stringable, string][] = []> = M extends [
//   infer First,
//   ...infer Rest,
// ]
//   ? First extends [infer Primitive, infer Replacement]
//     ? T extends Primitive
//       ? Replacement
//       : Rest extends [Stringable, string][]
//         ? PrimitiveMatcher<T, Rest>
//         : null
//     : null
//   : T

// type Hm = PrimitiveMatcher<"2", [["2", "yah"]]>

// type Replacement = string

// type PrimitiveMatcher<
//   T,
//   M extends Record<Replacement, Stringable>,
// > = T extends M[keyof M]
//   ? { [K in keyof M]: T extends M[K] ? K : null }[keyof M]
//   : null

// type Hm = PrimitiveMatcher<
//   "2",
//   {
//     // "piss": null
//     "": "2" | undefined
//   }
// >

// M extends [
//   infer First,
//   ...infer Rest,
// ]
//   ? First extends [infer Primitive, infer Replacement]
//     ? T extends Primitive
//       ? Replacement
//       : Rest extends [Stringable, string][]
//         ? PrimitiveMatcher<T, Rest>
//         : null
//     : null
//   : T

// type Hm = PrimitiveMatcher<null, [null, "piss"]>

// type Ts = `${undefined}`

// type Check<
//   Options extends
//     | [behaviour: "filter", type: any, fallback?: any]
//     | [behaviour: "fallback", fallback: any] = ["fallback", null],
// > = Options[0] extends "filter"
//   ? Options[2] extends undefined
//     ? "IS UNDEFINED"
//     : ""
//   : "NO"

// type Ch = Check<["filter", string]>
