import * as React from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

import { CSSVars } from "@amono/outil"
import { Liaison } from "@amono/liaison"

const lol = new CSSVars([["small", "boolean"], "medium", "large", "x-large"], {
  prefix: "breakpoint",
  type: "number",
})

type L = CSSVars<[["small", "boolean"], "medium", "large", "x-large"], "number">

type Lo = L["values"]

console.log("Hmmm", lol.values)

lol.set({
  small: true,
  medium: 6000,
  xLarge: 324,
})

CSSVars.set({
  hello: 2,
})

console.log(CSSVars.get("hello"))
console.log("Hmmm 2", lol.values)

const container = document.getElementById("root")
const root = createRoot(container!)

const interceptors = new Liaison({
  name: "interceptor-layer",
})

const lia = new Liaison(interceptors, {
  response: z => z.number(),

  // body: z => z.literal("SCHMEX"),

  params: z =>
    z.object({
      id: z.number().transform(String),
    }),

  url: "SIPPITY SOPPITY",
})

// const res = lia.chain["0-interceptor-layer"]

// const ext = lia.config.name

type Output = typeof lia.types.params

AbortController

interceptors.addInterceptor(
  "error",
  async function interceptErrors(err, req, stage, stack) {
    /**
     * As a general heuristic we can propably reduce the
     * noise of the stack somewhat by checking for files
     * served from a 'src' directory
     */
    // stack = stack
    //   ?.split("\n")
    //   .filter(e => e.includes("/src/"))
    //   .join("\n")

    console.error(
      `Network call failed at ${stage}-stage`,
      req,

      `\n\nError:\n\n`,

      err.name,
      err.message,

      // `\n\nNetwork call initated from:\n\n`,
      // stack,
    )

    return err

    // console.error(
    //   `%c Network call failed at ${stage}-stage:`,
    //   req.url,

    //   // `\nNetwork call failed at ${stage}-stage:\n\n${req.url}`,
    //   `%c error message:`,
    //   err.message,

    /**
     * As a general heuristic we can propably reduce the
     * noise of the stack somewhat by checking for files
     * served from a 'src' directory
     */
    //   `\n\nNetwork call initiated from:\n\n${stack
    // ?.split("\n")
    // .filter(e => e.includes("/src/"))
    // .join("\n")}`,
    // )

    // return err
  },
)

interceptors.addInterceptor("request", async function addAuth(req) {
  const url = new URL(req.url)
  url.searchParams.append("sessionId", "22222")

  return new Request(url, req)
})

// new AbortController().abort()

interceptors.addInterceptor("request", async function logOutgoing(req, stack) {
  console.log(`Outgoing requrest ${req.url}`, `\n\nInitiated from:\n\n${stack}`)
  return req
})

function App() {
  // useEffect(() => {
  //   lia2.get({
  //     // url: 'fsdfd',
  //     params: "PARAMS",
  //     input: "INPUT",
  //     // request: "INPUT",
  //   })
  // }, [])

  React.useEffect(function Mount() {
    lia
      .safeGo({
        params: {
          id: 3,
        },

        // body: "SCHMEX",
      })
      .then(([res, err]) => {
        if (err) {
          console.log("THEN ERR", err)
        } else {
          console.log("RES", res)
        }
      })
  })

  return (
    <>
      <h1>PLAYGROUND</h1>
      <div>COL</div>

      <br />
      <div>ROW</div>
    </>
  )
}

root.render(<App />)
