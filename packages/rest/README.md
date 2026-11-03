# @chelone/rest

A data provider for Chelone, a headless admin engine, that talks to a plain REST API.

```bash
pnpm add @chelone/rest
```

```ts
import { restDataProvider } from "@chelone/rest";

const dataProvider = restDataProvider({
  apiUrl: "https://api.example.com",
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});
```

Options, the default requests and how to fit it to an existing API: https://chelone.dev/docs/app-config/rest
