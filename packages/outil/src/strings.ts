export function lowercase<T extends string>(str: T): Lowercase<T> {
  return str.toLowerCase() as never
}
