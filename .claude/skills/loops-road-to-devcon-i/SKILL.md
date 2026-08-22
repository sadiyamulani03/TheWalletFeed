---
name: loops-road-to-devcon-i
description: >-
  Build for the Road To Devcon - I on Loops House: ideate with the AI
  mentor, query problem knowledge graphs (graph-RAG over each problem's
  resources), create and update the project submission, save ideation
  artifacts, and check the work against each problem's success criteria. Use
  this skill whenever the user mentions Road To Devcon - I, this contest, its
  problems or standings, submitting or improving their entry, problem
  docs/stacks, judging, or asks "what should I build" — even if they never
  say "loops".
version: 0.3.2
requires_bin: loops
---

# Road To Devcon - I — Loops House skill

Help the builder compete in ONE event: `road-to-devcon-i`. This skill carries the event data, ready-to-run `loops` commands, and the workflow below. Commands come pre-filled with the right slugs — replace only the `<angle-bracket>` placeholders. Never invent or substitute ids: the user has at most one project per event (team membership counts), and the platform resolves it from the session, so no project id appears anywhere in this skill.

The user has no project here yet. Ideate freely; create one with `loops project create` when they are ready to submit.

## Work in this order

Each step's output feeds the next:

1. **Check auth.** Run `loops auth status` before any other command and at the start of every session — sessions expire, and every other command fails confusingly without one.
2. **Orient.** Read the event data below (stage, deadlines, problems), then run `loops project get --event road-to-devcon-i` to see where the submission stands.
3. **Ideate and research.** Brainstorm with the mentor (`ideate`); answer problem questions from the inlined briefs, stacks, and rubrics first, and ground anything beyond them in `knowledge query` — cite the problem's knowledge graph instead of asserting its reference materials from memory.
4. **Persist.** Save promising directions as artifacts; create or update the submission as the project takes shape.
5. **Evaluate before the deadline.** Run `loops evaluate` for every targeted problem and act on the feedback — the judge probes the same points.

Command output is structured (add `--json` for machine-readable form) and often ends with a suggested next command (CTA) — follow it rather than guess. On `NOT_AUTHENTICATED`, run the auth flow. On `credits_exhausted`, stop and tell the user — never retry.

## Authenticate

```sh
loops auth status                        # run FIRST — who am I?
loops --version   # must match this skill's frontmatter `version`
```

If the installed CLI is older than this skill's `version`, update first (`npm install -g loopshouse@latest`) — the commands below assume the stamped version.

A failed check means the CLI still needs install + login. Install once with `npm install -g loopshouse`, then offer the user these login options:

- **Google**: `loops auth login --provider google` — opens the browser.
- **GitHub**: `loops auth login --provider github` — opens the browser.
- **Email one-time code**: `loops auth login --email <you@example.com>` sends a 6-digit code; verify with `loops auth verify --email <you@example.com> --code <123456>`.

In headless contexts the browser flows print a URL for a human to open. Re-run `loops auth status` to confirm before continuing.

## Read the event data

Treat this TOON document as ground truth for the event (TOON = compact JSON: `key: value` lines; a uniform array renders as a `name[N]{col1,col2,…}:` header plus one comma-separated row per element):

```toon
event:
  slug: road-to-devcon-i
  name: Road To Devcon - I
  tagline: Reading Ethereum
  stage: build_open
  stageMeaning: Building phase — submissions are OPEN until the end date
  timezone: Asia/Calcutta
  prizeCurrency: USD
  startsAt: "Aug 21, 2026, 11:11 PM (Asia/Calcutta)"
  submissionDeadline: "Aug 23, 2026, 11:11 PM (Asia/Calcutta)"
  registrationDeadline: "Aug 22, 2026, 1:04 PM (Asia/Calcutta)"
  description: null
problems[3]:
  - title: The Wallet That Won't Explain Itself
    slug: wallet-activity-feed
    brief: "A DeFi-adjacent friend keeps pasting wallet addresses into a block explorer trying to piece together \"what did this address actually do\" swaps, NFT buys, incoming payments and gives up halfway through page 3 of results. They want a simple lookup tool: paste an address, get back a clean, complete history of everything it sent and received. **What you'll learn** Querying an address's full historical activity with Alchemy's Transfers API (`alchemy_getAssetTransfers`) without scanning the chain yourself, handling the transfer-type taxonomy (external ETH, ERC-20, ERC-721, ERC-1155, internal ETH), and correctly draining a paginated, directional result set instead of assuming the first response is …"
    successLooksLike: "Paste in a busy wallet address and get back its real transfer history, every category, both directions, every page, not just a partial slice that happens to fit on screen."
    suggestedStack[3]: Node.js,Alchemy SDK,TypeScript
    judgingCriteria[1]{name,weightPct}:
      "Problem interpretation, product judgment & code craft",20
  - title: The Multi-Chain Bag Nobody Can Total Up
    slug: portfolio-valuation-dashboard
    brief: "A friend has tokens scattered across five different chains and has never once seen a single trustworthy number for \"what is all of this worth right now.\" Every wallet UI they've tried only shows one chain at a time, and one janky bot they used once silently returned a lower total the one time a chain's RPC hiccuped — nobody caught it, because it didn't error, it just quietly under-reported. **What you'll learn** Fetching multi-chain token holdings in a single fan-out request via the Portfolio API, pricing those holdings with the Prices API, and — the part that actually separates builds — handling the Portfolio API's partial-failure shape correctly: a failed network still returns HTTP 200, wi…"
    successLooksLike: "Paste in a wallet with holdings on several chains and get one trustworthy total — and if a chain fails to return data, that's visible, instead of the person unknowingly seeing a partial number presented as the whole picture."
    suggestedStack[4]: Node.js,Alchemy SDK,TypeScript,"React (optional, for a dashboard UI)"
    judgingCriteria[1]{name,weightPct}:
      "Problem interpretation, product judgment & code craft",20
  - title: The Alert That Fired Twice (Or Never)
    slug: onchain-event-watcher
    brief: "A small DAO's treasury multisig wants a ping every time a specific event fires on a contract they care about — a deposit, a withdrawal, whatever. The last bot someone hacked together either missed events during a brief RPC blip, or fired the same alert three times after a chain reorg. Nobody trusts it anymore, so it just sits there muted. **What you'll learn** Querying event logs with `eth_getLogs` against a defined block range, building a topic filter from the actual event signature hash rather than decoding-and-comparing every log, and the restart/reorg/duplication traps that come from treating \"seen once\" as \"seen forever\" without persisting any state. **What to do** 1. Accept a contract …"
    successLooksLike: "Leave it running across several polling cycles and a restart — every real event surfaces once, nothing is missed, and nothing is repeated."
    suggestedStack[3]: Node.js or Python,ethers.js / web3.py,A local file or SQLite for checkpoint state
    judgingCriteria[1]{name,weightPct}:
      "Problem interpretation, product judgment & code craft",20
```

`event.stage` and the deadlines are snapshots from when this skill was generated and do not update — sanity-check timing before planning multi-day work.

## Budget credits

**1 credit = one ideator turn or one knowledge-graph query.** Project and artifact commands and the evaluator prompt are free. Spend credits on load-bearing questions, not browsing, and check the balance before a research burst:

```sh
loops credits --event road-to-devcon-i
```

## Ideate with the AI mentor

The mentor knows this contest's problems, briefs, and judging criteria, grounded in each problem's knowledge graph. Conversations persist locally per event (`~/.loops/sessions/`) and continue automatically — each call sends one more message, so ask follow-ups freely instead of cramming everything into one prompt.

```sh
loops ideate --event road-to-devcon-i -m "<your prompt>"
loops ideate --event road-to-devcon-i -m "<follow-up>"               # same conversation
loops ideate --event road-to-devcon-i --withProject -m "<prompt>"    # mentor sees the user's project
loops ideate --event road-to-devcon-i --new -m "<fresh start>"       # discard the session first
loops ideate --event road-to-devcon-i --problems <problemSlug> -m "<prompt>"   # focus on one problem
loops session --event road-to-devcon-i            # show the stored conversation (--clear to delete)
```

Pass `--withProject` once a project exists — feedback grounded in the actual build beats generic advice.

## Query problem knowledge graphs (graph-RAG)

Each problem in this contest has a knowledge graph built from its brief, resources, and reference materials. A query returns a **cited evidence block** (entities, relationships, chunks, sources) — read the evidence and compose the answer yourself, citing it. The event data above already inlines each problem's brief, success criteria, stack, and rubric — answer from it first; query the graph for reference materials and depth the inline data doesn't carry, and to fetch the full brief when the inline one ends in "…" (long briefs are clipped). 1 credit per query. One ready command per problem:

```sh
# The Wallet That Won't Explain Itself
loops knowledge query --event road-to-devcon-i --problem wallet-activity-feed -q "<your question about The Wallet That Won't Explain Itself>"

# The Multi-Chain Bag Nobody Can Total Up
loops knowledge query --event road-to-devcon-i --problem portfolio-valuation-dashboard -q "<your question about The Multi-Chain Bag Nobody Can Total Up>"

# The Alert That Fired Twice (Or Never)
loops knowledge query --event road-to-devcon-i --problem onchain-event-watcher -q "<your question about The Alert That Fired Twice (Or Never)>"
```

## Manage the project

The project IS the submission. The user has at most one here, and the platform resolves it from the session — no ids, no listings.

```sh
loops project get --event road-to-devcon-i       # current state (exists=false if none yet)
loops project create --event road-to-devcon-i --name "<name>" --repoUrl <url> --tagline "<one-liner>"
loops project update --event road-to-devcon-i --description "<new description>"
```

**Update is a PATCH**: only the fields you pass change — an update with just `--tagline` cannot wipe the repo URL. Fields: `--name`, `--tagline`, `--pitch`, `--description`, `--repoUrl`, `--demoUrl`, `--videoUrl`.

## Save ideation artifacts

Save ideas, problems, and tech-stack notes against this event — they appear in the user's web playground too, so persist anything worth keeping instead of letting it die in the conversation. Kinds: `idea`, `problem`, `tech-stack`, `note`.

```sh
loops artifact list --event road-to-devcon-i
loops artifact save --event road-to-devcon-i --name "<title>" --kind idea --body "<markdown body>"
loops artifact update --event road-to-devcon-i --id <artifactId> --body "<updated markdown>"
loops artifact remove --event road-to-devcon-i --id <artifactId>
```

## Evaluate the project against a problem

Fetch a self-contained evaluator prompt for one problem (free; the platform attaches the user's project record), then **execute the prompt yourself inside the project repo** — it assumes the code access you have. The prompt walks that problem's brief, success criteria, and weighted judging criteria and returns alignment feedback: verified strengths, gaps, and where to focus. Run it for every problem the project targets, well before the deadline.

```sh
# The Wallet That Won't Explain Itself
loops evaluate --event road-to-devcon-i --problem wallet-activity-feed

# The Multi-Chain Bag Nobody Can Total Up
loops evaluate --event road-to-devcon-i --problem portfolio-valuation-dashboard

# The Alert That Fired Twice (Or Never)
loops evaluate --event road-to-devcon-i --problem onchain-event-watcher
```

Report the feedback to the user, then apply agreed improvements via `loops project update`.
