## Summary

Proposal for **Finance Pax**: a dedicated teammate agent that understands your money and gives actionable recommendations (trade/hold/rebalance, cut/redirect/reward, analyse holdings)—not just logging. Includes when to add a new agent vs when to only add tools.

## Motivation

- I want a finance-focused agent that truly understands my portfolio, budgets, debt goals, and spending so that I get concrete recommendations: "stop paying for this," "just buy this asset," "reward yourself for [X]," and trade/hold/rebalance advice.
- I want a clear rule for when to add new agents (teammates) vs when to only add tools to the orchestrator, so we don't over-engineer (e.g. OKRs stay on main Pax) but do split when the domain has a distinct persona (e.g. Finance Pax).

## Proposed behaviour

**What Finance Pax is**

- **Role:** Dedicated teammate that gives actionable recommendations—not just logging or summaries.
- **Scope:** Expenses (categories, sub-categories, budgeting), debt clearance goals, investments (holdings, performance, allocation), monthly/quarterly rebalancing.
- **Types of advice:** Cut ("stop paying for this"), Redirect ("just buy this asset"), Reward ("reward yourself for [something]"), Portfolio (trade/hold/rebalance, analyse assets).
- **Persona:** Analytical, recommendation-oriented, life-aware. Different from main Pax (orchestrator = journal + tasks + OKRs + general support).

**Why a new agent (teammate) instead of just new tools**

- **Different role:** Main Pax = "What did you do? What will you do?" Finance Pax = "Here's what I recommend and why."
- **Heavy domain prompt:** Finance needs categories, budgets, debt rules, allocation, rebalancing logic, cut/redirect/reward guidelines. Putting that in the main prompt competes with journal/tasks/OKRs.
- **Different context:** Main = log, tasks, OKR progress. Finance = holdings, budgets, expenses, goals.
- **Clear "who":** User asks "Should I sell X?" → expects the finance voice.

**When to add a new agent vs when not to**

| Add new agent when | Don't add when |
|--------------------|----------------|
| Domain has distinct role (e.g. analyst vs companion) | Domain is life/work glue (e.g. OKRs), same voice as journal/tasks |
| Domain needs a lot of instructions that would bloat main prompt | Small set of tools + short prompt addition is enough |
| You want a clear "who" for the user | — |
| **Example:** Finance Pax | **Example:** OKRs on main Pax; expense-only logging |

**Integration**

- Main Pax (orchestrator) routes to Finance Pax when the user asks about money, investments, subscriptions, rewards, or rebalancing.
- Finance Pax has finance-only prompt and tools; returns recommendations (orchestrator relays or UI shows).
- Data: expenses, budgets, debt, holdings in Notion (or other stores); same metadata scope/schema where relevant.

## Alternatives considered

- **Only add finance tools to main Pax:** Would dilute the main prompt and mix two personas (companion vs adviser); not chosen for full recommendation/analysis scope.
- **Expense logging only on main Pax:** Viable if we never add recommendations; once we want "stop paying for this" / "buy this asset" / rebalance advice, a dedicated agent fits better.

## Additional context

- **Status:** Proposal only. No implementation. Use as reference for "when new agents vs when not" and when designing Finance Pax.
- **Source:** Content derived from `.cursor/plans/proposal-finance-pax.md` (can be kept in sync or this issue becomes source of truth so it's not lost when changing machines).
