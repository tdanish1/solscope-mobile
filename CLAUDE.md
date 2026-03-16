# SolScope Mobile — Claude Instructions

## Project
SolScope is a mobile Solana smart money intelligence app.
Stack: React Native/Expo (single App.js), Node.js backend on Railway.
APIs: Nansen, Helius, Jupiter, DexScreener, CoinGecko.
Backend repo: C:\Users\Logon\solscope-backend (GitHub: tdanish1/solscope)
Mobile repo: C:\Users\Logon\solscope-mobile (GitHub: tdanish1/solscope-mobile)

## Core Principles

### Absolute Accuracy
- Rigorously fact-check and verify all information before responding
- Do not guess or hallucinate — zero factual errors is the standard
- If data shows as 0 or empty, that's a bug until proven otherwise
- Never say "this should work" — verify it works
- Don't assume an API endpoint supports a parameter without testing it first

### Four Equal Priorities
Optimize all outputs for these four pillars equally:
1. **Quality** — correct, reliable, production-grade code
2. **Efficiency** — minimal API calls, fast load times, clean architecture
3. **Profitability** — features that make the product valuable to users
4. **Aesthetic Appeal** — polished, attractive UI that looks professional

### High Autonomy
- If confidence in an action exceeds 80%, execute directly without asking
- If confidence is below 80%, pause and request clarification before proceeding

### Maximum Output Quality
- Maximize output quality regardless of time or token limits
- Do not optimize to save tokens — exhaust all available context and resources if it guarantees a superior final product

## About Me
I'm not a professional developer — I'm learning as I build.
- Give exact commands to copy-paste, never assume I know how to run something
- Explain what changes do in simple terms
- Don't use jargon without explaining it

## Code Quality
- Never use mock/fake/placeholder data — always use real API data
- Always verify API responses actually return what we expect before building features on them
- Test endpoints with curl before assuming they work
- When something shows $0 or empty, investigate — don't just move on

## API Credits
- Nansen: 10M credit budget, must last 2+ years
- Before adding new Nansen API calls, calculate the credit impact per day/year
- Cache aggressively — minimum 15 min cache on per-token queries
- Always show credit math before implementing

## Decision Making
- Small fixes (typos, missing null checks): just fix them
- New features or UI changes: describe what you'll do before doing it
- Anything that costs money (API calls, deployments): tell me the cost first
- Never delete or overwrite working code without explaining why
- If something isn't working after 2 attempts, stop and explain the problem instead of trying a 3rd approach

## Communication
- Keep responses short and direct
- Don't repeat back what I said — just do it
- When showing before/after, use a simple table
- If I ask "is this working?" — test it, don't guess
- Tell me when something CAN'T be done, don't work around it silently

## Git & Deployment
- Always commit with clear messages explaining WHY, not just WHAT
- Don't push to production without telling me
- After pushing, verify the deploy actually worked before saying "done"
- Backend auto-deploys on Railway when pushed to main

## Common Mistakes to Catch
- Don't assume an API endpoint supports a parameter without testing it first
- Don't add features nobody asked for
- Don't refactor working code while fixing a bug
- Always test the actual endpoint response before writing code that depends on it
