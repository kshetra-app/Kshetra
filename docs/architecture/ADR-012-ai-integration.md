# ADR-012: AI/LLM Integration Architecture

**Date**: 2026-04-27
**Status**: Accepted
**Deciders**: Founding team

## Context

KSHETRA's third engine is an AI-powered political intelligence layer. Users should be able to ask natural language questions about elections, constituencies, and political trends.

## Decision

### Architecture

```
Mobile App → API Server (Fastify) → OpenAI API (gpt-4o-mini)
                    ↓
           Seed data injected as context
```

### Key Design Choices

1. **Server-side LLM calls**: API server handles all OpenAI calls. Mobile never touches the API key directly.
2. **Context injection**: System prompt includes Telangana seed data (constituency results, election history) so the AI has factual grounding.
3. **Graceful degradation**: App works fully without an API key. AI features show "Configure AI" prompt.
4. **Model**: `gpt-4o-mini` — fast, affordable, good enough for factual Q&A. Upgrade path to GPT-4o or Claude.

### API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/ai/status` | GET | Check if AI is configured |
| `/api/v1/ai/chat` | POST | Conversational chat |
| `/api/v1/ai/analyze/constituency/:acNo` | GET | Quick constituency analysis |
| `/api/v1/ai/analyze/trends` | GET | Election trend summary |

### Mobile UI

- Full-screen chat modal (`/ai-chat`)
- Suggested questions for new users
- AI button on Intelligence tab header
- Message history within session (not persisted)

### Honesty Guardrails

- System prompt explicitly tells AI which data it has and which it doesn't
- Instructions to never fabricate per-constituency historical data
- AI should say "I don't have that data" when appropriate

## Consequences

- AI features are entirely optional — zero impact on core app
- API key management is server-side only (secure)
- Easy to swap providers (OpenAI → Anthropic → local LLM)
- Context window used efficiently (only relevant seed data injected)
