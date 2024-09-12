## Motivation & Philosohy

### 1. Static vs. Dynamic

The idea for a simple TypeScript first HTTP client API came about
when I realised that fetch is somewhat unvieldy because it accepts
a huge amount of options at call time, a lot of which is statically known
ahead of time; method, url, shape of response and request, headers, mode, etc… This means that you almost always end up with some ad hoc abstraction or wrapper functions because you want to e.g. only pass the request body which means you inevitably end up loosing a consistent API in favour of a lot of free floating fetch wrapper functions because we shy the verbosity we would otherwise get.

```js
/**
 * Doing something this every time
 * you need to fetch is verbose
 */

const url = new URL("resource")
url.searchParams.append('id', id)

const res = await fetch(url, {
  body: JSON.stringify(data),
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}).then(res => res.json())

/**
 * Thus it tends to always become
 * its own ad hoc function instead,
 * highlighting that there is a divide
 * between what is known at and before call time.
 */
export function postData(data, id) {
  const url = new URL("resource")
  url.searchParams.append('id', id)

  return await fetch(url, {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())
}

postData(data, id);
```

Thus the Idea came about to make a composable API that allows for
the distinction between statically known configuration and dynamic data only
known at call time. This means that you use a consistent API at both
the configuration stage and call time.

### 2. Co-location vs. Arbitrary Separation

A successful API call is composed of many parts; url, types, headers, etc… A very established and unfortunate convention is to separates these, often through different placements in the file system, like `some-path/types.ts` and `some-other-path/constants/urls.ts`. This means that important components of an endpoint have to be found by trailing multiple very distinct paths in the project. This means that without sufficient domain knowledge, you will have trouble stitching together the relevant parts of an endpoint because related code is not kept together. Co-location by feature would allow for a lot more agency without any prior knowledge. While `fetch` itself is not opinionated about this, the goal is to make a fetch wrapper that easily facilitates co-location as a first class architectural choise.

### 3. Fetch is Not Feature Complete

Native fetch pretty much begs for an abstraction because it has key missing features.

- Fetch does not have any runtime validation of data, meaning succesful HTTP communication may still end up in unexpected data, formally known as a schema-drift. Fetch has no type safety. A response is usually type cast, a practise that is very poor at catching such schema drifts.

- Fetch has no interceptor like functionality, which makes it very prone to e.g. repeated case by case handling of auth or errors.

- Poor or lacking defaults. Headers for example are almost always wrong for real world usage and should default to `'Content-Type': 'application/json'`. The goal shouldn't be to override fetch defaults, but to allow for setting other defaults where potentially needed.

- Repeated boilerplate needed for proper error handling. Only failed connection to remote will throw, meaning to check for an actually succesful response you also have to [check status code](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok) pretty much every time.

## Elevator Pitch

Fetch wrapper that incorporates types through runtime-validation, interceptors, and all the primitives needed to build a simple rest based API client along with some simple quality of life enhancements on top of native fetch.

## API

`Liaison`'s API should be familiar to anyone who has used native `fetch` as the goal is to keep fetch's API surface untouched where possible while making it more feature complete. As opposed to `fetch` being a function, `Liaison` is a class.

### Config Argument(s)

Liasion is a class that accepts a `config` object as an argument to its
constructor and an additonal config object at call time as an argument to the `go` or `safeGo` method which perform the actual network call.

Here is a basic usage example of `Liaison` and how it can be configured
to perform a hypotehecitcal basic network call.

```tsx
updateUsername = new Liaison({
  url: 'services/user/update-username',

  body: z => z
    .object({ username: z.string() })
    .transform(v => JSON.stringify(z))

  response: z => z.union([
    z.literal('taken'),
    z.literal('invalid'),
    z.literal('success')
  ]),

  params: z => z.object({ userId: z.string() })
  method: 'POST'
})

const [result, error] = updateUsername.safeGo({
  body: { username: 'some-new-name' }
  params: { userId: '1234' }
})
```

Config is mostly just fetch's native `RequestInit` object with a few additions and some slight modifcations to a few existing fields. This includes zod-schemas to determine types for inputs (body, url-params) and reponse. For a more detailed description of all the different types, [please see the type declarations](./src/types/concrete.ts).

#### Differences in config at and before call time.

Configuration for the network call can be established ahead of time and at call time. Some fields of the same name have different types depending on when they are utilized. E.g. `body` accepts a function returning a Zod schema at config time and the inferred type of said schema at call time. Fields that are
already passed at config time can't be passed at call time, they have to explcitly overriden through an `override` field. This is to make the API
explicit so you may easily spot if you are using an edpoint as intended or need added flexibility to cover some edge-case.

```tsx
const res = await updateUsername.go({
  body: { username: 'some-new-name' }
  params: { userId: '1234' }

  override: (config) => ({
    method: 'PUT',
    url: `${url}/replace`
  })
})
```

> [!IMPORTANT]
> Fetch's [body-field is polymorphic](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#setting_a_body) and can hold everything from complex data types to simple strings. To not rob fetch of its native functionality there is NO serialization or anything done to the `body` field under the hood. If use of a Zod-schema for the body, use [Zod's transfrom](https://zod.dev/?id=transform) if you need to serialize the data before sending it across the wire `z.object({ id: z.string }).transform(v => JSON.stringify(v))`.

> [!TIP]
> If an input schema is defined, e.g. `body` or `params`, you can use go-to-definition on said field in the `go`/`safeGo` metods to jump right back to the declaration of the schema.

### Composability

As with the above example, if this is one of usage, that's fine, but if you need that exact same config it would be frustrating and repetitive to override at call time — every time. In this case it would be sensible to extend the `updateUserName` endpoint.

```tsx
replaceUsername = new Liaison(updateUsernae, (ext) => {
  url: `${ext.url}/replace`,
  method: 'PUT'
})
```

`Liaison` has an overloaded constructor where you
can pass an instance as the first argument and addiotional config (or a callback function returning new config) as the second argument. The new and existing config will be shallow-merged. This type of extending can be carried on indefinently. This makes it easy to e.g. build sensible defaults

```tsx
const defaults = new Liaison({
  headers: {
    "Content-Type": "application/json",
  },
})

const getUser = new Liaison(defaults, {
  url: "get-user",
  response: z => z.object({ username: z.string() }),
})

const deleteUser = new Liaison(defaults, {
  url: "delete-user",
  params: z => z.object({ id: z.string() }),
})
```

All generic type information carries over effortlessly. This can be very powerful if you need to reference previously established config

```tsx
const getUser = new Liaison({
  url: "some-url",
  response: z =>
    z.object({
      user: z.object({
        contactInfo: z.object({
          phoneNumber: z.string(),
        }),
      }),
      /* … other fields like address, name, etc. */
    }),
})

/**
 * transform will be poperly typed as the extended insance's
 * types are all available in the config callback
 */
const getUserPhoneNumber = new Liaison(getUser, ext => {
  response: () => ext.transform(v => v.user.contactInfo.phoneNumber)
})
```

> [!TIP]
> The generic type paramters uses the `const modifier` introduced in TypeScript 5.0, this means everything passed to an instance can be referenced by its most literal value, meaning `instance.config.url` will equete to a literal string, which is extremely handy when referncing values and inspecting types using intellisense.

### Return value

`Liaison` has two methods that may initiate a network call; `go` and `safeGo`. The only difference between the two is the return value. The first will throw on error and otherwise resolve with the value of the response object. The other is a tuple that holds either only the response value, or only the error, but it will return the error as value as opposed to throwing.

```ts
const [res, err] = route.safeGo()

if (!error) {
  err // err is successfully narrowed to the response value
}

// `go` have to error handled on its own
route.go().catch(console.error)
```

returning an error as a value as opposed to throwing is very powerful, but there are cases when trowing makes more sense. React Query as an exaple, expectss the `queryFn` to throw, otherwise it cannot reliable know on its own when an error has occured.

### Intercepting

You can add interceptors to mitigate repetitive case-by-case error- and auth-handling.

```tsx
defaults.addInterceptor(
  "error",
  async function interceptErrors(err, req, stage, stack) {
    console.error(`"${req.url}" failed at ${stage}-stage`, err.message)

    return err
  },
)

// …

useEffect(() => {
  const controller = new AbortController()

  defaults.addInterceptor(
    "request",
    async function addAuth(req) {
      const url = new URL(req.url)
      url.searchParams.append("sessionId", "54134235")

      return new Request(url, req)
    },
    {
      signal: controller.signal,
    },
  )

  return () => {
    signal.abort()
  }
}, [authToken])
```

You can use an `AbortController` to remove interceptors, useful to sync an interceptor with the React lifecycle. Interceptors are triggered by a `Liaison`'s `go` or `safeGo` method and also trigger the interceptors of any extended instances.

> [!TIP]
> Need to trace where the network call was initiated? If you use `console.warn` or `console.error` when intercepting errors, you should see the exact origin of the call when expanding the log and inspecting the trace, that is unless there is an obscene amount of things happening and the trace doesn't show enough frames. In that case you can use the last argument of the interceptor callback, which is a captured stack at the time of initating the network call. The sourcemap may not be as accurate in this case as it otherwise may be, at least in Chrome.

### Accessing Instance Metadata

When configuring a `Liaison` instance, you may need to reference said config in other contexts, e.g. the response of an endpoint should be passed to
another function as an argument and for that you may need its type for the parameter.

```tsx
new getUser = new Liaison({
  url: 'some-url'
  params: z => z.object({ id: z.string() })
  response: z => z.object({ name: z.string() })
})

function createUserGreeting(user: typeof getUser.types.response) {
  return `Hello, ${user.name}!`
}
```

This quickly becomes one of `Liaison` bigger selling points; your endpoints become the source of truth for types and values that propagate throughout the
codebase.

Let's say you need to write a React Query hook you may need multiple components of the endpoint;

```tsx
function useUser(params: typeof getUser.types.params) {
  return useQuery({
    queryKey: [getUser.config.url, body]
    queryFn: getUser.go({ params })
  })
}
```

The `instance.config`'s type is an accumulation of all instance extensions, so no config data/types are left behind. If for some reason there is a need to view/retrieve extensions sorted from earliest extend to the most recent, you can use the `instance.chain` property.

> [!TIP]
> Any field referenced from the `config` field supports go-to-deinition and will jump to the declration of said field.

### Differences from fetch

As stated previously, the goal of `Liaison` is to be a small fetch-wrapper that keeps as much of fetch's types, docs and lingo as is possible while still adressing its shortcomings. Types are used in a manner that preserves as mutch of Fetch's types and JSDoc as possible on Intellisense.

#### Only a single object-argument

Fetch's argument signature is polymorphic in nature.
You can pass an url-string, an url-instance or a Request object. Additionally, you can pass a RequestInit-object as the second argument. All of the above can also be passed to the constructor of a `Request` class and then passed to `fetch`. Meaning there's some self-referential types in there as well. This API's flexibility is powerful and is used at great effect under the hood of `Liaison` — but for more relaiability, consitency and TypeScript friendliness, this is reduced to a single object argument that is mostly derived from and slightly modifies fetch's `RequestInit` type. The most important difference may there is an addiotional url-field that only accepts a string.

#### Unwrapping of response

By default, the `go` or `safeGo` methods will unwrap the response unless a custom `handleResponse` callback is provided. It will unwrap JSON or textual data according to headers. It will also unwrap any response with a status outside the 200 range and coerce it to an `Error`. There are times when you want to use other methods and properties on the response object, like reading response headers or unwrap to other types like e.g. a `blob`.

```tsx
const getThumbnail({
  url: 'get-thumb',
  handleResponse: (res) => res.blob()
})
```

### Differences from other popular HTTP client libraries

Method shorthands are popular in third party libraries like [Axios](https://axios-http.com/). They are intentionally omitted from 'Liaison' as configuring an endpoint ahead of time to constrain its options at call time is what prvides guidance and clarity. This is a core design choice. Having to explicitly override already defined fields prompts a very conscious decision to do so. Otherwise it would be too easy to mistakenly override any property and break an endpoint entirely. Method shorthands are antithetical to this idea.

<br />
<br />
<br />

## Thoughts on creating an HTTP client

I have experience trying to write fetch wrappers/api clients, my most recent attempt used just functions instead of a class. That approach had a few key limitations;

- Hard to read/maintain function signature because so much is determined by function arguments. Class makes it easier to reason with separate constructor and method signatures.
- Poor intellisense because any data about the request has to be stored on the function object, meaning they are obfuscated by all the prototype and function properties.

Classes so far has several advantages

- Easier to create a clean public API because internal implementation details can be more easily hidden and API can be split up over constructor, class methods and other public class fields.

Previous attempt at a function based fetch wrapper was also severely held back
by ideal of not straying from fetch's function signature, spesifically its arguments. Having just one composable object is MUCH easier than dealing with a tuple (input, init). The input argument is variadic, meaning it can be both a string url and a much more complex Request object. This worsens DX considerably because you cannot have any reasonable intellinsense information about the url. By forcing it to be a string, you can type it as a constant so
it becomes way easier to see what endpoint you are trying to get at.

A class based approach has one downside IMO, typescript does not have support for callable instances, meaning a class instance that has a `call` method is not understood by TS. This means that to actually make the HTTP call you need to call spearate methods on the instance.

### Picking a runtime type validator

By popularity, [Zod](https://zod.dev/) is far ahead of other validators. It is small, has a simple API but has gotten pushback because of poor TypeScript performance. Another validator that claim to adress sluggish performance is [ArkType](https://arktype.io/). I generally struggle w/ ArkType's API. Until their DOCS become more complete it is just way to hard to use as compared to Zod, despite the potential performance gains. Maybe sometime in the future Liaison can accept any validator of choice.
