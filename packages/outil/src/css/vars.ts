import type { Prettify } from "../types"

interface PrimitiveMap {
  string: string
  boolean: boolean
  number: number
}

/** Union of supported primitive types which `CSSVars` can cast values to */
type Primitive = Prettify<keyof PrimitiveMap>

/** Return the corresponding type in map from string key, default to string which is the `getPropertyValue` return type */
type GetPrimitive<T> = T extends keyof PrimitiveMap ? PrimitiveMap[T] : string

export interface CSSVarsOptions<T = undefined> {
  /**
   * When putting CSS variables e.g. in the `:root` selector, it is a common pattern
   * to prefix related variables to reduce chance of collison
   * and more semantic variable groups. Prefix will be joined with variable name w/ single dash.
   *
   * Use the `prefix` option to reduce the verbosity of defining the
   * target variables and less redundancy in the result dictionary.
   */
  prefix?: string

  /**
   * Choose which value to cast/coerce the CSS variable into.
   * Defaults returntype of `getPropertyValue` which is a string.
   */
  type?: T & Primitive

  /**
   * Where to look for variables. Defaults to the document root HTML node.
   */
  element?: HTMLElement

  /**
   * Provide the consuming env with some additonal information if the
   * root variables are not found; e.g. where to find them, where to set them, etc…
   */
  notFoundWarning?: string
}

/**
 * Helper that provides elegant API for managing a set of CSS variables.
 *
 * Benefits:
 * - Strongly typed getter/setters.
 * - Warns when encountering missing variables
 * - Kebab-cases variables into an object for more JS friendly referencing
 * - Static methods for easy one-off usages
 * - Elegant API/typings setting type of variable values
 */
export class CSSVars<
  const T extends (string | [name: string, typeOverride: Primitive])[],
  U,
> {
  #element = document.documentElement
  #options: CSSVarsOptions<U>
  #vars: T

  private declare Values: Prettify<{
    [K in T[number] as KebabToCamel<K extends string ? K : K[0]>]: K extends [
      string,
      infer V,
    ]
      ? GetPrimitive<V>
      : GetPrimitive<U>
  }>

  constructor(vars: T, options: CSSVarsOptions<U> = {}) {
    this.#options = options
    this.#vars = vars

    options.element && (this.#element = options.element)
  }

  #kebabKey(k = "") {
    return k.replace(/-./g, x => (x[1] ?? "").toUpperCase())
  }

  get values(): typeof this.Values {
    let warning = ""
    const computed = getComputedStyle(this.#element)

    const result = this.#vars.reduce<Record<string, unknown>>((a, e) => {
      const [varName, typeOverride] = <[string, Primitive?]>[e].flat()

      const propertyName = `--${[this.#options.prefix, varName].filter(Boolean).join("-")}`
      const propertyValue = computed.getPropertyValue(propertyName)

      if (!propertyValue)
        warning = `"${propertyName}" is not defined or without a value`

      let coercedValue: unknown

      switch (typeOverride ?? this.#options.type) {
        case "boolean":
          coercedValue = propertyValue === "true"
          break

        case "number":
          coercedValue = parseInt(propertyValue)
          break

        default:
          coercedValue = propertyValue
      }

      return { ...a, [this.#kebabKey(varName)]: coercedValue }
    }, {})

    if (warning)
      console.warn(
        ...[`[CSSVars]: ${warning}`, this.#options.notFoundWarning].filter(
          Boolean,
        ),
      )

    return result as never
  }

  get #names(): Record<string, string> {
    return this.#vars.reduce<Record<string, string>>((a, e) => {
      const [varName = ""] = [e].flat()
      return { ...a, [this.#kebabKey(varName)]: varName }
    }, {}) as never
  }

  /**
   * typed setter that only allows keys and corresponding values as defined
   * by the constructor. Uses DOM-element and other options like variable prefix
   * as defined in the constructor options-argument.
   */
  set(vars: Partial<typeof this.Values>) {
    for (const [key, value] of Object.entries(vars)) {
      const propertyName = `--${[this.#options.prefix, this.#names[key]].filter(Boolean).join("-")}`
      this.#element.style.setProperty(propertyName, String(value))
    }
  }

  /**
   * Static utility for one off usage when needing to set a CSS variable
   */
  static set(
    vars: Record<string, unknown>,
    element = document.documentElement,
  ) {
    for (const [key, val] of Object.entries(vars))
      element.style.setProperty(`--${key}`, val + "")
  }

  /**
   * Static utility for one off usage when needing to read a CSS variable
   */
  static get(name: string, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(`--${name}`)
  }
}

const breakpointvars = new CSSVars(["hello-world", ["lorem-ipsum", "number"]], {
  type: "boolean",
})

// breakpointvars.Map.

// breakpointvars.Vars

/**
 * Very basic kebab to camel type utility.
 *
 * @note may have edge cases if leading or trailing dashes
 * depending on desired behaviour
 */
export type KebabToCamel<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${KebabToCamel<P3>}`
    : Lowercase<S>
