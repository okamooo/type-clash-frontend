/**
 * タイピング対戦で使用する型定義
 */

/**
 * 対戦ワードの情報（バックエンドの MagicWords と一致）
 */
export interface MagicWord {
  magicId: number;
  magicText: string;
  magicReading: string;
  magicTarget: string;
}

/**
 * 対戦中のリアルタイム同期メッセージ（バックエンドの BattleMessage と一致）
 */
export interface BattleMessage {
  userId: number;
  matchId: number;
  score: number;
  accuracyRate: number;
  typedChars: number;
  missCount: number;
  currentHp: number;
  damage?: number;
  messageId?: string;
  content: string;
}

/**
 * 対戦結果（ユーザー指定の絶対的な定義）
 * id = 対戦ID（matchId）。マッチング成立時に DB 上の主キーとして確定する。
 */
export type BattleResultResponse = {
  id: number;
  winnerId: number | null;
  finishedAt: string;
  players: BattlePlayerResultResponse[];
};

/**
 * 各プレイヤーの対戦結果詳細（ユーザー指定の絶対的な定義）
 */
export type BattlePlayerResultResponse = {
  id: number;
  role: "player1" | "player2";
  score: number;
  accuracyRate: number;
  typedChars: number;
  missCount: number;
  isWinner: boolean;
};

/**
 * 対戦画面の状態管理用
 */
export type BattleStatus = "searching" | "found" | "ready" | "playing" | "finished";

/**
 * 対戦相手の情報
 */
export interface OpponentInfo {
  id: number;
  name: string;
  iconImage: string | null;
}
