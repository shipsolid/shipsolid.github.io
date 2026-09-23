---
title: "SignalForge — OTel Validation Lab"
description: "Configurable OpenTelemetry signal generator for validating Alloy pipelines, testing cardinality budgets, and firing alert rules under controlled conditions. Used to validate observability configs before they reach production."
tags: ["OpenTelemetry", "Alloy", "Prometheus", "Kubernetes", "Python", "YAML"]
github: "https://github.com/shipsolid/signal-forge"
status: "active"
featured: true
order: 1
externalUrl: "https://signal-forge.shipsolid.workers.dev/"
---

The full SignalForge write-up lives at <https://signal-forge.shipsolid.workers.dev/> — built from
the [`signal-forge`](https://github.com/shipsolid/signal-forge) repo's `docs/` tree and deployed to
Cloudflare Workers via Cloudflare's native Git integration on that repo. This entry only feeds the
`/projects` and homepage cards; `/projects/signal-forge` redirects to the Workers site (see
`astro.config.mjs`).
