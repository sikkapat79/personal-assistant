# Proposal: Finance Pax (teammate agent)

Example proposal for when to add a **new agent** (teammate) vs when to **only add tools** to the main orchestrator.

---

## 1. What Finance Pax is

**Role:** A dedicated teammate that truly understands your money and gives **actionable recommendations**—not just logging or summaries.

**Scope:**

- **Expenses & structure** – Multiple categories (and sub-categories), budgeting per category, debt clearance goals.
- **Investments** – Track holdings, performance, allocation; monthly or quarterly rebalancing.
- **Recommendations** – Trade / hold / rebalance; analyse assets you hold; explain why.

**Types of advice (examples):**

- **Cut** – “Stop paying for this.” e.g. Cancel or downgrade a subscription; cut an expense that doesn’t serve you.
- **Redirect** – “Just buy this asset.” e.g. Instead of spending $X on [habit], put it into [ETF/asset]; suggest amount and rationale.
- **Reward** – “Reward yourself for [something].” e.g. You hit a debt milestone or savings goal; suggest a bounded way to celebrate without blowing the plan.
- **Portfolio** – Analyse holdings; recommend trade / hold / rebalance with clear reasoning.

**Persona:** Analytical, recommendation-oriented, life-aware. Different from main Pax (orchestrator), which is journal + tasks + OKRs + general support.

---

## 2. Why a new agent (teammate) instead of just new tools

**In LLM terms:** “Persona” is domain-specific: what the model is instructed to do and what context it sees. Different prompt + different tools + different context slice → different effective behaviour (different “top N” the model attends to). A teammate = a separate agent call with **finance-only** system prompt and **finance-only** tools.

**Why that fits Finance Pax:**

| Reason | Explanation |
|--------|-------------|
| **Different role** | Main Pax: “What did you do? What will you do? How are you?” Finance Pax: “Given your data and rules, here’s what I recommend (trade/hold/cut/reward) and why.” |
| **Heavy domain prompt** | Finance needs: categories, budgets, debt rules, allocation targets, rebalancing logic, when to recommend sell/hold/buy, how to explain analysis, cut/redirect/reward guidelines. Putting that in the main prompt competes with journal/tasks/OKRs and dilutes both. |
| **Different context** | Main: today’s log, open tasks, OKR progress. Finance: holdings, prices, allocation, budgets, expenses, subscriptions, goals. Separate agent = right context for each. |
| **Clear “who”** | User asks “Should I sell X?” or “Can I reward myself?” → they expect the **finance** voice and recommendation style, not the general companion. |

So: **Finance Pax = separate agent** (different persona = different prompt + context), not just extra tools on the orchestrator.

---

## 3. When to add a new agent vs when not to

**Add a new agent (teammate) when:**

- The domain has a **distinct role** (e.g. analyst/adviser vs companion).
- The domain needs **a lot of instructions** (rules, how to reason, how to phrase advice) that would bloat or conflict with the main prompt.
- You want a **clear “who”** for the user (e.g. “I’m asking the money person”).
- **Example:** Finance Pax (recommendations: trade/hold/rebalance, cut/redirect/reward, analyse holdings).

**Do not add a new agent when:**

- The domain is **life/work glue** (goals, daily priorities, reflection) that fits the same voice as journal and tasks.
- A **small set of tools** plus a short prompt addition is enough; no heavy domain logic.
- **Example:** OKRs (list objectives, key results, progress; tie to tasks and journal). Same Pax can own “what am I working toward?” with a few tools and a small prompt section.

**Summary:**

| Domain | New agent? | Why |
|--------|------------|-----|
| Finance (recommendations, analysis, cut/redirect/reward) | Yes | Different persona (adviser); heavy domain prompt; distinct “who.” |
| OKRs (goals, key results, progress) | No | Same persona as orchestrator; extends journal/tasks; light tools. |
| Expense logging only (no advice) | No | Could stay as tools on main Pax. |
| Full finance (above + recommendations) | Yes | Recommendation + analysis need the dedicated finance agent. |

---

## 4. Integration

- **Main Pax (orchestrator)** – Journal, tasks, OKRs, general support. Routes to Finance Pax when the user asks about money, investments, subscriptions, rewards, or rebalancing.
- **Finance Pax (teammate)** – Finance-only prompt and tools. Returns recommendations (and optionally structured data) so the orchestrator can relay or the UI can show them.
- **Data** – Expenses, budgets, debt goals, holdings, targets live in Notion (or other stores); both agents use the same metadata scope and schema where relevant. Finance Pax has tools to read/write finance data and compute recommendations.

---

## 5. Status

**Proposal only.** No implementation. Use this as an example for “when new agents vs when not” and as a reference when designing Finance Pax later.

**GitHub issue (source of truth when changing machines):** [Issue #7 – Proposal: Finance Pax (teammate agent)](https://github.com/sikkapat79/personal-assistant/issues/7). Body follows the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
