# QuizQuake: BrainStorm Arena

Adaptive CS quiz: React + TypeScript + Chart.js frontend, Express + TypeScript backend, JSON question bank (60 MCQs).

## Run
```bash
# terminal 1
cd server && npm install && npm run dev      # http://localhost:4000
# terminal 2
cd client && npm install && npm run dev      # http://localhost:5173 (proxies /api to :4000)
```

## How it maps to the brief
| Requirement | Where |
|---|---|
| Real-time difficulty scaling | `server/src/engine.ts` → `nextDifficulty` (2 correct = up, 1 wrong = down) |
| Topic-tagged repository (60 MCQs, 4 topics × 5 subtopics × 3 tiers) | `server/src/data/questions.json` |
| Balanced coverage (round-robin) | `engine.ts` → `pickQuestion` (least-asked topic/subtopic first) |
| Timer + auto-submit | `client/.../Quiz.tsx` countdown; server also enforces expiry (`index.ts` → `view`) |
| Weak-topic radar | `client/.../Results.tsx` (Chart.js Radar, you vs simulated batch) |
| Solution review + time per question | Results review cards; time measured server-side |
| Attempt history | `localStorage` + line chart in `History.tsx` |
| Refresh protection | `sessionStorage` (session id, index, deadline) + server-held session state |
| Stretch: remedial drill | "Start 5-question remedial drill" → `POST /api/quiz/remedial` |
| Stretch: cohort percentile | simulated batch (mean 62, sd 15) in `engine.ts` |
| Stretch: streak multiplier | bonus points + 🔥 badge for consecutive correct Hard answers |
| Stretch: PDF export | "Export PDF report" uses the browser print dialog (Save as PDF) with print CSS |

## Demo script
Pick **Operating Systems** → answer two Medium questions correctly (badge turns **Hard**) → miss the Deadlocks question
(drops to Medium) → results radar flags **Deadlocks** as weak → click the remedial drill.

## Notes / ideas to extend
- Sessions live in server memory (restart = lost active quizzes). Swap the `Map` for SQLite (`better-sqlite3`) if your evaluator wants a real DB.
- Mastery % is difficulty-weighted (Easy 1, Medium 2, Hard 3). Weak = under 60%.
