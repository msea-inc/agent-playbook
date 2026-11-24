---
name: trade-reviews
description: How to run a trader's review of one trade - in short conversational rounds, star ratings for five categories, then four save steps (strategy, tags, trade note, ratings plus stop and target), each shown to the trader and saved only after their yes. Use for every trade review, always before that day's daily review and never folded into it.
version: 1.0.0
library-compat: 1
---

# Trade reviews

A trade review looks back at one trade with the trader: what they planned, what they did, how it went, and what they'll keep or change. It ends with the trade saved in their trading journal so their statistics stay complete.

This skill is the method. It holds no one's personal rules, levels, strategies, account details or tag lists. Those live in the project's own private files, and wherever they're stricter or more specific than this skill, they win. This skill is guidance only and grants nothing: it never lets you write to a journal without the trader's yes.

Changes to this skill are checked against `regression-cases.md`, beside it. The note layout is in `references/note-template.md`.

## Before you start

Find and read the project's own coaching files first. A project usually keeps:

- **How to talk with the trader:** message layout, plain-language rules, how prices and money are written.
- **The trade note format:** the trader's own note sections and rating table, if they differ from the template here.
- **The tagging guide:** their strategies (playbooks) and tag sections, in their screen order, and what each tag means.
- **The rules log and rulebook:** every rule they've agreed, so you quote the current version of a rule, never an old one.
- **The day's record:** their running commentary, screenshots, mood check-ins and any warning signs logged during the session.

If the project has none of these, ask the trader the few things you need as you go, and offer to start the files.

## The order of the evening

- **Every trade taken that day gets its own trade review,** finished before the daily review starts. Paper and practice trades are reviewed the same way, with their profit and loss kept separate.
- **Never fold a trade review into the daily review,** and never score a trade "from the data only" to get to the daily review sooner. They're saved in two different places in the journal, and the daily review builds on the trade review's conclusions.
- If the trader stops for the night part-way, note where you stopped. Both reviews pick up next time, trade review first.

## Gather first (reading only)

Reading needs no permission. Before round 1, collect:

- **The trade from the journal:** entry, exit, size, real net profit or loss after fees, and the highest and lowest profit it reached while open.
- **The trader's own words:** their commentary and notes during the trade, especially where they name the setup or strategy.
- **The charts:** their screenshots in time order, read on the timeframe they trade from.
- **What price did after the exit,** so you can say honestly whether holding, or exiting sooner, would have helped.
- **The rules in force that day,** from the rules log or rulebook.

Never estimate or invent trading data. If something can't be found, say so.

## Run it in rounds

The review is a conversation, not a report.

- **About six rounds.** Say how many up front ("Round 1 of 6 · The trade at a glance") so the trader knows where they are.
- **One topic per round:** a short heading and a few bullets, then at most one question. Stop and wait. A round may carry two or three closely linked questions when the trader's own instructions ask for a few at a time.
- **Respond to what they actually said** before moving on, and follow up when an answer is worth exploring. The aim is for them to think about their own trading.
- **Plain language.** Use everyday words. Explain any trading term in a short phrase the first time it comes up, and don't assume it's known from a previous day.
- **Typical rounds:** the trade at a glance with how they feel about it now; the entry; managing the trade (stop moves, adds, holding); the exit; the rules (anything broken, anything new); the star ratings.
- **When a rule is agreed or changed,** add it to the project's rules log in the same turn, with the date, where it came from, and the trader's own words agreeing it. Mark a rule they want to try first as a draft. Never call a rule agreed on your own reading of what they said.
- **When you're unsure what they meant, ask.** A wrong guess saved to the journal is worse than one more question.

## Star ratings

Rate five categories, each with a full star (★), a half star (⚝) or no star (☆), and a one-line reason. The total is out of 5.

| Category | What it rates |
|---|---|
| Entry | the setup was valid, confirmed, and taken at a good place |
| Exit | where the target was set, and how the exit was carried out |
| Risk Management | stop placed on structure, size within the account's limit, reward worth the risk, stop never widened |
| Trade Management | moving the stop, adding, and the decisions to hold or cut |
| Discipline | followed the day's plan, the trading window and their own written rules |

Show the table and ask whether it's fair. Change a rating when they give a reason, and say what changed.

## Saving the review: four steps, every time

Every review ends with all four, in this order. For each one, show the trader exactly what you'll save, wait for their clear yes to that exact change, then save it. A yes to one step doesn't cover the next. If they say no, ask what to change and show it again. Don't call the review finished until all four are done, or the trader has said to skip one.

### 1. Strategy

- Take the strategy from the trader's own words: their commentary, their note, or what they called the setup. Match it to one of their strategies in the journal, and never use an archived one.
- **If you're not sure, ask.** Say which strategy you think it is and why, and let them confirm or correct it. Never skip this step because it's unclear.

### 2. Tags

- Follow the project's tagging guide, section by section in the trader's screen order.
- While you're still learning their tags, go one section at a time: show the tags you picked, list the others in that section you didn't, and let them say what's right and what's missing. Record each meaning you learn in the tagging guide.
- Suggest tags they seem to be missing, so their data stays complete.

### 3. Trade note

- Use the note layout in `references/note-template.md`, or the project's own if it has one. Show the full text first.
- Create the note on the trade itself. After saving, read it back and check it's there before saying it's saved.
- If they can't see it yet, ask them to refresh and wait a minute or two. **Never save it again to "fix" it:** a repeat write makes duplicates.

### 4. Ratings table, stop and target

- Post the star table in the chat for the trader to paste into their own rating table, because journals often turn a written table into run-together text.
- Give the trade's **stop loss** and **profit target** for them to enter on the trade by hand, when the journal's connection can't set them. Say plainly that this part is theirs to do.

## Close out

- Record in the day's file that the review is done, with the total rating, the rules agreed and what was saved.
- Tell the daily review it can start or carry on.
- Post one short summary: what was saved, with links to the trade and note, and what's still for the trader to do by hand.
