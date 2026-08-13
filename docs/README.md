# Deal Truth ML design docs

These files are the Worker architecture and operations reference. The running Worker also serves them at `/v1/reference` (and `/v1/reference/{name}`), with `/api/v1/reference` as an alias matching the Deal Truth API.

| Doc                                      | What it covers                                            |
| ---------------------------------------- | --------------------------------------------------------- |
| [API.md](API.md)                         | HTTP routes, auth, error envelope, backend compat aliases |
| [MODELS.md](MODELS.md)                   | Workers AI routing, neuron budget, JSON rules             |
| [PROMPTS.md](PROMPTS.md)                 | Prompt library and output contracts                       |
| [HOSTING.md](HOSTING.md)                 | Local Docker, ngrok, production Worker                    |
| [DEPLOYMENT.md](DEPLOYMENT.md)           | One-hour local + production ship                          |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Product map across the three repos                        |
| [LICENSE_AUDIT.md](LICENSE_AUDIT.md)     | Model and dependency licenses                             |
