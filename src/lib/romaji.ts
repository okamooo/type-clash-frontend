/**
 * ローマ字タイピング判定（シングル・対戦共通）
 *
 * - DB の romaji_target はキーボード表記（shi, 助詞「は」も ha）を正とする
 * - 日本式（si, ti 等）やヘボン式の助詞 wa 入力を許容する
 * - 拗音はし・ち行＋じ行（ワープロ zya 系）の別表記を許容（きゃ＝kya 等は表記が1種類のため同一）
 */

/** 同じ音節とみなすローマ字のグループ（各要素は最大3文字） */
const SYLLABLE_ALIAS_GROUPS: readonly string[][] = [
  ["shi", "si"],
  ["chi", "ti", "ci"],
  ["tsu", "tu"],
  ["fu", "hu"],
  ["ji", "zi", "di"],
  ["ja", "zya", "jya"],
  ["ju", "zyu", "jyu"],
  ["jo", "zyo", "jyo"],
  ["sha", "sya"],
  ["shu", "syu"],
  ["sho", "syo"],
  ["cha", "tya", "cya"],
  ["chu", "tyu", "cyu"],
  ["cho", "tyo", "cyo"],
];

const aliasKey = (chunk: string) => chunk.toLowerCase();

const ALIAS_LOOKUP = new Map<string, Set<string>>();
for (const group of SYLLABLE_ALIAS_GROUPS) {
  const variants = new Set(group.map(aliasKey));
  for (const variant of variants) {
    ALIAS_LOOKUP.set(variant, variants);
  }
}

const MAX_CHUNK_LEN = 3;

/** 長さが違う別表記（si/shi など） */
const DIFFERENT_LENGTH_ALIAS_PAIRS: readonly (readonly [string, string])[] = [
  ["si", "shi"],
  ["ti", "chi"],
  ["ci", "chi"],
  ["tu", "tsu"],
  ["hu", "fu"],
  ["zi", "ji"],
  ["di", "ji"],
];

/** キー入力を半角 a-z に正規化（全角英字・長音対応） */
export function normalizeRomajiKey(key: string): string | null {
  const normalized = key
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[ー]/g, "-")
    .toLowerCase();

  if (normalized.length !== 1) return null;
  if (!/^[a-z-]$/.test(normalized)) return null;
  return normalized;
}

function areSyllableAliases(a: string, b: string): boolean {
  if (a === b) return true;
  const setA = ALIAS_LOOKUP.get(aliasKey(a));
  const setB = ALIAS_LOOKUP.get(aliasKey(b));
  if (setA && setB && setA === setB) return true;
  return false;
}

/** 助詞など: 正解が ha のときヘボン式 wa も許容 */
function areHaWaEquivalent(typed: string, target: string): boolean {
  return typed === "wa" && target === "ha";
}

function isDifferentLengthAliasPair(a: string, b: string): boolean {
  return DIFFERENT_LENGTH_ALIAS_PAIRS.some(
    ([short, long]) =>
      (a === short && b === long) || (a === long && b === short),
  );
}

/** 正解側のこの位置から始まる別表記グループ（cha/tya/cya 等） */
function getAliasSetAtTarget(target: string, targetIndex: number): Set<string> | undefined {
  for (let len = MAX_CHUNK_LEN; len >= 1; len--) {
    const set = ALIAS_LOOKUP.get(aliasKey(target.slice(targetIndex, targetIndex + len)));
    if (set) return set;
  }
  return undefined;
}

function isStrictPrefixOfAliasVariant(
  chunk: string,
  aliasSet: Set<string>,
): boolean {
  if (chunk.length >= MAX_CHUNK_LEN) return false;
  for (const variant of aliasSet) {
    if (variant.length > chunk.length && variant.startsWith(chunk)) {
      return true;
    }
  }
  return false;
}

function canCompleteTypedToAliasVariant(
  typedRemainder: string,
  aliasSet: Set<string>,
): boolean {
  for (const variant of aliasSet) {
    if (
      variant.startsWith(typedRemainder) &&
      variant.length > typedRemainder.length
    ) {
      return true;
    }
  }
  return false;
}

/** ge+c 誤結合（gec）のように、塊の途中で別の拗音音節が始まる一致を禁止 */
function crossesAliasSyllableBoundary(
  chunk: string,
  target: string,
  targetIndex: number,
): boolean {
  for (let offset = 1; offset < chunk.length; offset++) {
    if (getAliasSetAtTarget(target, targetIndex + offset)) {
      return true;
    }
  }
  return false;
}

function areChunksEquivalent(
  typedChunk: string,
  targetChunk: string,
  target: string,
  targetIndex: number,
): boolean {
  const aliasSet = getAliasSetAtTarget(target, targetIndex);

  if (typedChunk === targetChunk) {
    if (crossesAliasSyllableBoundary(typedChunk, target, targetIndex)) {
      return false;
    }
    if (aliasSet && isStrictPrefixOfAliasVariant(typedChunk, aliasSet)) {
      return false;
    }
    return true;
  }

  if (typedChunk.length === targetChunk.length) {
    if (areSyllableAliases(typedChunk, targetChunk)) return true;
    if (areHaWaEquivalent(typedChunk, targetChunk)) return true;
    return false;
  }

  return isDifferentLengthAliasPair(typedChunk, targetChunk);
}

/** cya 入力中の cy など、音節の途中まで許容する */
function isIncompleteRomajiPrefix(typed: string, target: string): boolean {
  let typedIndex = 0;
  let targetIndex = 0;

  while (typedIndex < typed.length && targetIndex < target.length) {
    let advanced = false;

    for (
      let typedLen = Math.min(MAX_CHUNK_LEN, typed.length - typedIndex);
      typedLen >= 1;
      typedLen--
    ) {
      const typedChunk = typed.slice(typedIndex, typedIndex + typedLen);

      for (
        let targetLen = Math.min(MAX_CHUNK_LEN, target.length - targetIndex);
        targetLen >= 1;
        targetLen--
      ) {
        const targetChunk = target.slice(targetIndex, targetIndex + targetLen);

        if (!areChunksEquivalent(typedChunk, targetChunk, target, targetIndex)) {
          continue;
        }

        typedIndex += typedLen;
        targetIndex += targetLen;
        advanced = true;
        break;
      }
      if (advanced) break;
    }

    if (!advanced) {
      const aliasSet = getAliasSetAtTarget(target, targetIndex);
      if (!aliasSet) return false;
      return canCompleteTypedToAliasVariant(typed.slice(typedIndex), aliasSet);
    }
  }

  return typedIndex === typed.length;
}

/**
 * typed が target の prefix として成立するとき、消費した target 側の文字数。
 * 成立しないときは null。
 * メモ化あり（別表記照合のバックトラックが長文+ミス入力で爆発するのを防ぐ）。
 */
export function getMatchedTargetLength(
  typed: string,
  target: string,
): number | null {
  if (typed.length === 0) {
    return 0;
  }
  const memo = new Map<string, number | null>();
  return matchFromTargetFirst(0, 0, typed, target, memo);
}

/** 正解側の最長音節を優先してマッチ */
function matchFromTargetFirst(
  typedIndex: number,
  targetIndex: number,
  typed: string,
  target: string,
  memo: Map<string, number | null>,
): number | null {
  if (typedIndex === typed.length) {
    return targetIndex;
  }
  if (targetIndex >= target.length) {
    return null;
  }

  const memoKey = `t|${typedIndex},${targetIndex}`;
  const cached = memo.get(memoKey);
  if (cached !== undefined) {
    return cached;
  }

  for (
    let targetLen = Math.min(MAX_CHUNK_LEN, target.length - targetIndex);
    targetLen >= 1;
    targetLen--
  ) {
    const targetChunk = target.slice(targetIndex, targetIndex + targetLen);

    for (
      let typedLen = Math.min(MAX_CHUNK_LEN, typed.length - typedIndex);
      typedLen >= 1;
      typedLen--
    ) {
      const typedChunk = typed.slice(typedIndex, typedIndex + typedLen);

      if (!areChunksEquivalent(typedChunk, targetChunk, target, targetIndex)) {
        continue;
      }

      const rest = matchFromTargetFirst(
        typedIndex + typedLen,
        targetIndex + targetLen,
        typed,
        target,
        memo,
      );
      if (rest !== null) {
        memo.set(memoKey, rest);
        return rest;
      }
    }
  }

  memo.set(memoKey, null);
  return null;
}

/** typed + 1文字 が正解ローマ字の続きとして有効か */
export function isValidRomajiAppend(
  typed: string,
  nextChar: string,
  target: string,
): boolean {
  const next = typed + nextChar;
  if (getMatchedTargetLength(next, target) !== null) {
    return true;
  }
  return isIncompleteRomajiPrefix(next, target);
}

/** 入力が正解ローマ字と一致完了したか */
export function isRomajiComplete(typed: string, target: string): boolean {
  const matched = getMatchedTargetLength(typed, target);
  return matched !== null && matched === target.length;
}

/** 画面表示用: 未入力の正解側の残り（別表記で進んだ分は target 基準） */
export function getRemainingRomajiDisplay(
  target: string,
  typed: string,
): string {
  if (typed.length === 0) {
    return target;
  }
  if (target.startsWith(typed)) {
    return target.slice(typed.length);
  }
  const matched = getMatchedTargetLength(typed, target);
  if (matched === null) {
    return target.slice(typed.length);
  }
  return target.slice(matched);
}

