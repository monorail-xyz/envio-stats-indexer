# Monorail Envio Stats Indexer

An Envio indexer to capture stats from Monorail's aggregation

_Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features_

## Run

```bash
pnpm envio dev
```

## Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)

## Example queries

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

### Tokens data

```graphql
query MyQuery {
  Token {
    feeAmount
    id
    totalAmount
    tradeInAmount
    tradeOutAmount
  }
}
```

### Global data

```graphql
query MyQuery {
  GlobalStats(where: { id: { _eq: "global" } }) {
    feeMultiplier
    feeReceiver
    owner
  }
}
```
