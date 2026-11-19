export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
}
export type PublicQuestion = Omit<Question, 'answer' | 'explanation'>;

export interface AnswerRecord {
  questionId: string;
  selected: number;
  correct: boolean;
  timeSpent: number; // seconds
  points: number;
  difficulty: Difficulty;
}

export interface QuizSession {
  id: string;
  mode: 'adaptive' | 'remedial';
  scope: string;            // 'All' or a topic name (adaptive); 'Remedial' otherwise
  focus: string[];          // weak subtopics (remedial only)
  total: number;
  durationSec: number;
  startedAt: number;
  questionStartedAt: number;
  current: Question | null;
  difficulty: Difficulty;
  streak: number;           // consecutive correct answers at the current tier
  hardStreak: number;       // consecutive correct answers at Hard
  maxHardStreak: number;
  score: number;
  asked: string[];
  history: AnswerRecord[];
  finished: boolean;
  report?: DiagnosticReport;
}

export interface MasteryItem {
  label: string;
  correct: number;
  total: number;
  percent: number;        // difficulty-weighted mastery
  cohortPercent: number;  // simulated batch average
}

export interface ReviewItem {
  question: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  options: string[];
  selected: number;
  answer: number;
  correct: boolean;
  timeSpent: number;
  explanation: string;
}

export interface DiagnosticReport {
  sessionId: string;
  scope: string;
  mode: 'adaptive' | 'remedial';
  answered: number;
  correct: number;
  accuracy: number;
  score: number;
  maxHardStreak: number;
  totalTimeSec: number;
  radarLevel: 'topic' | 'subtopic';
  radar: MasteryItem[];
  bySubtopic: MasteryItem[];
  weak: string[];           // weak subtopics (< 60% mastery)
  difficultyPath: Difficulty[];
  percentile: number;
  cohortMean: number;
  review: ReviewItem[];
}
