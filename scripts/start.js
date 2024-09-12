// @ts-check

import {
  promises as fs,
  // @ts-ignore Typescript not up to date with node-22?
  globSync as glob
} from "node:fs"

import { spawn } from "node:child_process"
import autocomplete, { Separator } from "inquirer-autocomplete-standalone"
import chalk from "chalk"
import pkg from "../package.json" with { type: "json" }

/**
 * SIMPLE INTERACTIVE CLI SCRIPT TO BROWSE/SEARCH
 * AND INITIALISE PAKCAGE.JSON SCRIPTS FROM WHOLE MONOREPO
 */

/** @typedef {{name: string, description: string, scripts: Object.<string, string>}} Package */

process.on("uncaughtException", err => {
  console.error("Could not complete start script: " + err.message)
  process.exit(1)
})

/**
 * Additional args passed to chosen script.
 */
const argv = process.argv.slice(2)

const packageFiles = glob(pkg.workspaces.map(w => `./${w}/package.json`))

/**
 * @type {Array.<Package>}
 *
 * Package.json contents of each workspace project
 */
const packages = [
  await Promise.all(
    packageFiles.map(e =>
      fs
        .readFile(e, { encoding: "utf-8" })
        .then(JSON.parse)
        .then(data => ({
          ...data,
          scripts: filterScripts(data?.scripts ?? {})
        }))
    )
  ),
  {
    name: pkg.name,
    scripts: filterScripts(pkg.scripts)
  }
].flat()

/**
 * Used to format output when searching for scripts
 */
let longestScriptNameLength = packages
  .map(e => Object.keys(e.scripts))
  .flat()
  .reduce((a, e) => (e.length > a ? e.length : a), 0)

let [script, workspace] = await autocomplete({
  message: "Choose which workspace project to start",
  source: async (input = "") => {
    const options = packages.filter(filterStartScripts(input)).map(e => {
      const filteredDisplayName = e.name.replace(
        new RegExp(input, "g"),
        match => chalk.bold(match)
      )

      return {
        name: filteredDisplayName,
        description: `\n${e.name}: ${chalk.dim(e.description)}`,
        value: ["start", e.name]
      }
    })

    return [
      ...options,
      new Separator(),
      {
        name: "Other",
        description: "\nBrowse all other available scripts",
        value: ["other"]
      },
      {
        name: "Other — Copy selected command (macOS)",
        description:
          "\nBrowse all other available scripts and copy to pasteboard",
        value: ["other-copy"]
      },
      new Separator()
    ]
  }
})

const parentScript = script

if (script == "other" || script == "other-copy") {
  ;[script, workspace] = await autocomplete({
    message: "Choose script to run from worksapce project",

    source: async (input = "") => {
      const options = packages
        .map(e => {
          return [
            new Separator(chalk.italic.dim(e.name)),
            ...Object.keys(e.scripts).map(script => {
              const scriptNameLength = script.length
              const fillLength = longestScriptNameLength - scriptNameLength

              const filteredDisplayName = [
                script,
                chalk.dim(".").repeat(fillLength),
                e.name
              ]
                .join(" ")
                .replace(new RegExp(input, "g"), match => chalk.bold(match))

              return {
                name: !input.length ? script : filteredDisplayName,
                value: [script, e.name],
                description: `\nCommand: ${chalk.dim(
                  formatScript(script, e.name, argv)
                )}`
              }
            })
          ]
        })
        .flat()

      return [
        ...options.filter(option =>
          input.length
            ? !(option instanceof Separator) && option.name.includes(input)
            : option
        )
      ]
    }
  })
}

if (parentScript == "other-copy") {
  const formattedScript = formatScript(script, workspace, argv)
  const child = spawn("pbcopy")

  child.stdin.write(formattedScript)
  child.stdin.end()

  console.log("✅", "Script copied to pasteboard")
  process.exit()
}

/**
 * Start selected script
 */

const child = spawn(formatScript(script, workspace, argv), {
  stdio: "inherit",
  shell: true
})

/**
 * Measure Performance
 */

let t0 = 0

child.on("spawn", () => (t0 = performance.now()))
child.on("close", code => {
  if (code !== 0) return

  const ms = performance.now() - t0
  console.log("✅", `(${(ms / 1000).toFixed(2)}s)`, "\n")
})

/**
 * @param {string} input
 * @returns {(e:Package) => boolean}
 */
function filterStartScripts(input) {
  return e =>
    // Matches search
    e.name.includes(input) &&
    // Is not root
    e.name !== pkg.name &&
    // Has start script
    Object.keys(e.scripts).includes("start")
}

/**
 * Format the selected script as an npm-workspace script
 */
function formatScript(script = "", workspace = "", args = [""]) {
  return [
    "npm",
    "run",
    script,
    workspace !== "root" && ["-w", workspace],
    args.filter(Boolean).length && ["--", ...args]
  ]
    .filter(Boolean)
    .flat()
    .join(" ")
}

/**
 * Filters out pre and post scripts as they pollute the output and are rarely started on their own
 *
 * @param {Record<string, string>} scripts
 */
function filterScripts(scripts) {
  const tmp = Object.entries(scripts).map(([k, v], i, src) => {
    return {
      key: k,
      value: v,
      isPre: src.some(([k2]) => k.startsWith("pre") && k.substring(3) === k2),
      isPost: src.some(([k2]) => k.startsWith("post") && k.substring(4) === k2)
    }
  })

  return Object.fromEntries(
    tmp
      .filter(e => !e.isPost)
      .filter(e => !e.isPre)
      .map(e => [e.key, e.value])
  )
}
