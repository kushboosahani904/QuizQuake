export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface PublicQuestion {
  id: string; topic: string; subtopic: string; difficulty: Difficulty; text: string; options: string[];
}
export interface QuizState {
  sessionId: string; mode: 'adaptive' | 'remedial'; scope: string; total: number; index: number;
  answered: number; remainingSec: number; difficulty: Difficulty; score: number; hardStreak: number;
  finished: boolean; question: PublicQuestion | null;
}
export interface MasteryItem { label: string; correct: number; total: number; percent: number; cohortPercent: number }
export interface ReviewItem {
  question: string; topic: string; subtopic: string; difficulty: Difficulty; options: string[];
  selected: number; answer: number; correct: boolean; timeSpent: number; explanation: string;
}
export interface DiagnosticReport {
  sessionId: string; scope: string; mode: 'adaptive' | 'remedial'; answered: number; correct: number;
  accuracy: number; score: number; maxHardStreak: number; totalTimeSec: number;
  radarLevel: 'topic' | 'subtopic'; radar: MasteryItem[]; bySubtopic: MasteryItem[]; weak: string[];
  difficultyPath: Difficulty[]; percentile: number; cohortMean: number; review: ReviewItem[];
}
export interface TopicInfo { name: string; subtopics: string[] }
export interface HistoryEntry {
  id: string; date: string; scope: string; mode: string; accuracy: number; score: number; percentile: number; weak: string[];
}
