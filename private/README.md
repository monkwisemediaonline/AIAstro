# private/

Everything in this folder except this README and `seed.example.json` is git-ignored.

- `seed.local.json` — real family birth data. Imported once into the local database by
  `npm run seed:private`, after which the UI is the source of truth.
- Never copy these values into `tests/`, fixtures, logs, screenshots or commit messages.
