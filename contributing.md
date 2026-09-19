# Contributing

Thanks for helping keep this list useful. It is a curation, not a collection: the bar is "would I point a colleague at this", not "does it mention Jev".

## What gets in

An entry must:

- Actually call the Jev API, or be a documented replica of the System One interface on open models. A router or classifier that merely resembles the pattern does not count.
- Be public, have a readme that explains what it does, and not be archived.

And meet at least one of:

- Listed in five or more other Jev lists.
- Twenty or more stars.
- Fills a gap in a category nobody else covers.
- Publishes measured numbers (accuracy, latency, cost) with a method someone else could repeat.

## What stays out

- Repos with no code, or with more prose than code and no runnable check.
- Anything private, paywalled, or too vague to categorize.
- Launch commentary with no artifact.
- Duplicates. If a project already appears, improve its line instead of adding another.

## A note on bulk submissions

Several repos published by one author on the same day, sharing a scaffold, each landing in one or two commits, can pass every rule above and still be unproven. Being listed here is not a review of code quality, security, or whether the thing runs. Treat entries as leads. If you adopt one and it turns out to be hollow, open a PR to remove it; that counts as a contribution.

## Entry format

```
- [name](https://github.com/owner/name) - One sentence, uppercase start, period end.
```

- Describe what it does, not what it is. "Ranks installed skills per prompt" beats "A tool for skill ranking".
- Plain words for trust signals: "vendor-reported numbers", "independent replica, not TypeSafe weights", "reports 94 percent recall". No inline tags, no star counts, no emoji.
- No em dashes. Use a comma, a colon, or a new sentence.
- Add to the bottom of the most specific section unless the entry clearly outranks what is there.
- One link per URL across the whole file.

## What happens to your line

The readme is the source, and `scripts/parse-readme.mjs` turns it into `data/projects.json`. CI runs that parser on every pull request, and it throws on any bullet that does not match the format above, so a stray dash or a second link fails the build. The format is strict on purpose: one shape is what keeps the list readable by machines without a second copy of the data to maintain. From that JSON, the site at https://awesomejev.vercel.app rebuilds whenever main moves, and a scheduled job refreshes GitHub stars and activity once a day. The translated readmes are generated from the same data, so fix the English line and let the next refresh carry it over; never edit `README.zh-CN.md`, `README.ja.md`, or `README.ko.md` by hand. Section images are a single line of the form `<a href="repo"><img src="media/file"></a>` placed right under a heading, and the parser hands the image to whichever entry has the same URL.

## Before you open a PR

Run `npx awesome-lint`, `npm test`, and `npm run parse` in the repo root and fix what they report. The only expected lint failure is `awesome-git-repo-age` until the repo is thirty days old. `npm run parse` rewrites `data/projects.json`; commit that alongside your entry, because CI fails if the committed data is stale.

## Removing things

Dead repos, abandoned forks, projects that stopped calling Jev: open a PR that deletes the line and say why in one sentence.
