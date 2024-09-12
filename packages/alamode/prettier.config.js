import { defineConfig } from "./utils/define-prettier-config.js"

/**
 * Base prettier config for uxi, use as is or extend and modify as needed on a per project basis
 */
export default defineConfig({
  singleQuote: false,
  trailingComma: "all",
  arrowParens: "avoid",
  quoteProps: "consistent",
  semi: false,
  tabWidth: 2,
  endOfLine: "auto"
})
