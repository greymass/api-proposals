
api-proposals
==================

API that maintains an index of all msig proposals and allows lookups by account.

Requirements: 

- An API server to bootstrap off of.
- A P2P node to keep in sync with.

This application works by bootstrapping its state from a large number of `get_table_row` calls and then staying in sync using the P2P network.

Once running, access the API through `/proposals/ACCOUNT_NAME` (replacing `ACCOUNT_NAME` with any valid account). This endpoint will return any proposed msigs that require this accounts signature.

Developing
----------

Edit `config/default.toml` for configuration options. With node.js installed, run `make dev`. 

Run with docker-compose
---------------

First create a copy of the `.env` file from the example.

```
$ cp .env.example .env
```

Edit the new `.env` file, and fill in API, P2P, and port information used to feed data to the API.

Then build/start the container.

```
$ docker-compose build
$ docker-compose up -d
```

---

Made with ☕️ & ❤️ by [Greymass](https://greymass.com).
