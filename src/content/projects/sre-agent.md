---
title: "SRE Agent — Autonomous Incident Response"
description: "LLM-backed SRE agent deployed on AKS. Receives alert webhooks from Grafana IRM, queries Grafana/Loki/Kubernetes, executes approved remediation playbooks, and generates draft post-mortems — autonomously, before a human wakes up."
tags: ["Python", "FastAPI", "Claude API", "AKS", "Kubernetes", "Grafana", "LLM", "MCP"]
github: "https://github.com/shipsolid"
status: "active"
featured: true
order: 3
results:
  - "[Add: alert-to-context latency, before vs. after the agent — the number an interviewer will ask for first]"
  - "[Add: fraction of draft post-mortems that needed no human edits, if tracked]"
  - "[Add: scale — number of services / alert volume the agent covers in IEO AKS Dev]"
---

An experimental but production-adjacent SRE agent that closes the gap between alert fire and human
context.

## Architecture

FastAPI backend with a Streamlit operator UI, a Redis-backed state store for in-flight incident
context, and an MCP sidecar exposing Grafana/Loki/Kubernetes as callable tools to the Claude-backed
reasoning loop. Azure AD handles RBAC on who can approve a remediation action. A validator gate sits
between "the agent proposes a remediation" and "the remediation executes" — every action has to
clear that gate before it touches the cluster.

## Trade-offs

**Validator gate vs. full autonomy** — kept a human-approvable gate in front of any state-changing
remediation, trading some of the "before a human wakes up" promise for a hard guardrail against a
bad LLM decision touching production. [Add: a case where this gate caught something, or where you
decided it was safe to relax it for a specific playbook.]

**MCP sidecar vs. embedding tool calls directly** — put Grafana/Loki/Kubernetes access behind an MCP
sidecar rather than calling those APIs inline from the FastAPI service, trading a little latency for
a reusable tool surface that doesn't need auth/rate-limiting re-implemented per tool or per agent.

## Lessons Learned

[Add: the one thing about this agent that surprised you once it saw real alert traffic —
a false-positive playbook match, a draft post-mortem that nailed the RCA, one that didn't. This is
the part an L6/L7 interviewer will actually probe on.]
