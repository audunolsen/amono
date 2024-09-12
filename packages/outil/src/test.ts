// interface Chirp {
//   chirp(): string
// }

// interface Hoot {
//   Hoot(): string
// }

// type BirdShape<Sound extends "chirp" | "hoot"> = Sound extends "chirp"
//   ? Chirp
//   : Hoot

/** @deprecated */
type DeprecateNever = never

class Bird<Sound extends "chirp" | "hoot"> {
  // If sound extends "chirp" then it should have a chirp method, if it extends "hoot" it should
  // have a hoot method

  sound: Sound

  declare chirp: Sound extends "chirp" ? () => {} : undefined

  constructor(sound: Sound) {
    this.sound = sound

    this.chirp
  }
}

const dumpapp = new Bird("chirp")

dumpapp.chirp()

// interface GetMethod {
//   method: "GET"
//   // other properties specific to GET method
// }

// interface PostMethod {
//   method: "POST"
//   // other properties specific to POST method
// }

// type MethodType<Method extends "GET" | "POST"> = Method extends "GET"
//   ? GetMethod
//   : PostMethod

// interface Test<Method extends "GET" | "POST"> extends MethodType<Method> {}

// // Example usage:

// const getRequest: Test<"GET"> = {
//   method: "GET"
//   // add other properties specific to GET method
// }

// const postRequest: Test<"POST"> = {
//   method: "POST"
//   // add other properties specific to POST method
// }
