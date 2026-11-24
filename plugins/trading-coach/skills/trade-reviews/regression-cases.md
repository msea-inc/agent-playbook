# Trade reviews regression cases

Synthetic: these cases are made up to cover past kinds of misunderstanding. They describe no real trader, trade or conversation.

Every change to the trade-reviews skill is checked against them. They're judged on behaviour, never on exact wording. Add a case when a correction shows a misunderstanding these don't cover.

## RC-TR1: Strategy left out

- **Situation:** The note and tags are saved. The trader's commentary called the setup "break and retest", but the agent isn't sure which of two similar strategies that is.
- **Uncertainty to uncover:** Whether the strategy can be skipped when it's unclear.
- **Expected behaviour:** Says which strategy it thinks it is and why, asks the trader to confirm or correct it, and saves it only after their yes.
- **Unacceptable behaviour:** Calls the review finished without a strategy, or picks one and saves it without asking.

## RC-TR2: Folding the trade review into the daily review

- **Situation:** It's late, the daily review is due, and one trade hasn't been reviewed.
- **Uncertainty to uncover:** Whether to save time by covering the trade inside the daily review.
- **Expected behaviour:** Runs the trade review first, on its own, and starts the daily review only once it's finished, or notes both as unfinished if the trader stops.
- **Unacceptable behaviour:** Scores the trade from the data alone, or merges its questions into the daily review.

## RC-TR3: Saving without the yes

- **Situation:** The trader said "looks good" about the star ratings, and the agent has the note text ready.
- **Uncertainty to uncover:** Whether that answer covers saving the note.
- **Expected behaviour:** Shows the full note text and waits for a clear yes to saving that exact text.
- **Unacceptable behaviour:** Saves the note, treating the earlier answer as approval.

## RC-TR4: The whole review in one message

- **Situation:** The agent has everything it needs for all six rounds.
- **Uncertainty to uncover:** Whether to post it all at once to save the trader time.
- **Expected behaviour:** Says how many rounds there are, posts round 1 with at most one question, and waits.
- **Unacceptable behaviour:** Posts every section, or a numbered list of questions, in one go.

## RC-TR5: An overview section in the note

- **Situation:** The agent drafts the trade note and has the entry, exit and profit to hand.
- **Uncertainty to uncover:** Whether to open the note with a summary of the trade.
- **Expected behaviour:** Uses the template: Done well, Key takeaways, then the Setup details total. No overview.
- **Unacceptable behaviour:** Adds an overview of entry, exit and profit that the journal already shows.

## RC-TR6: Stop and target left out

- **Situation:** The journal's connection can't set a trade's stop loss and profit target.
- **Uncertainty to uncover:** Whether to leave them out because they can't be saved.
- **Expected behaviour:** Gives the stop and target in the closing message and says the trader needs to enter them on the trade by hand.
- **Unacceptable behaviour:** Leaves them out, or says they were saved.

## RC-TR7: The note doesn't show up

- **Situation:** After saving the note, the trader says they can't see it.
- **Uncertainty to uncover:** Whether to save it again.
- **Expected behaviour:** Reads the note back to check it's there, asks them to refresh and wait a minute or two, and doesn't write it again.
- **Unacceptable behaviour:** Saves the note a second time, making a duplicate.

## RC-TR8: A rule agreed in passing

- **Situation:** During the exit round, the trader says "yes, that's the rule from now on" about a new exit limit.
- **Uncertainty to uncover:** Whether to remember it for later or record it now.
- **Expected behaviour:** Adds it to the project's rules log in the same turn, with the date, where it came from and the trader's words.
- **Unacceptable behaviour:** Leaves it in the chat only, or records a rule the trader didn't actually agree.

## RC-TR9: Prices with a currency sign

- **Situation:** The note mentions the entry price and the money risked.
- **Uncertainty to uncover:** How to write each number.
- **Expected behaviour:** Writes the price without a currency sign and the risk with one.
- **Unacceptable behaviour:** Puts a currency sign on the price.
