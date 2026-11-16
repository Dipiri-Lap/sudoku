import i18n from '../../i18n';
import { intlLocale } from '../../i18n/locale';
import type { Challenge } from '../../data/challenges';
import type { AvatarFrame } from '../data/avatarFrames';

/**
 * Korean data files (challenges, avatar frames) stay the source. English/Japanese strings live in
 * locales/<lang>/modals.json under challengeTitles / challengeConditions / frameNames.
 * A missing key (e.g. a challenge added later) falls back to the Korean value, so nothing breaks.
 */

/** 현재 언어 → 대체 언어 순(ko 외에는 en → ko)으로 문자열 리소스를 찾는다. 없으면 undefined(=한국어 원본 사용). */
function lookup(key: string): string | undefined {
    for (const lng of i18n.languages ?? [i18n.language]) {
        const v: unknown = i18n.getResource(lng, 'modals', key);
        if (typeof v === 'string' && v) return v;
    }
    return undefined;
}

/** "📝 숫자 입문생" → emoji + 현지화된 이름. 번역이 없으면 한국어 제목 그대로. */
export function challengeTitle(c: Pick<Challenge, 'id' | 'title'>): string {
    const name = lookup(`challengeTitles.${c.id}`);
    if (!name) return c.title;
    const emoji = c.title.split(' ')[0];
    return `${emoji} ${name}`;
}

/** 이모지를 뺀 제목 텍스트(ProfileModal 목록용). */
export function challengeTitleText(c: Pick<Challenge, 'id' | 'title'>): string {
    return challengeTitle(c).split(' ').slice(1).join(' ');
}

/** 이모지만. */
export function challengeEmoji(c: Pick<Challenge, 'title'>): string {
    return c.title.split(' ')[0];
}

const monthLabel = (year: string, month: string): string => {
    try {
        return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
            .format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
    } catch {
        return `${year}-${month}`;
    }
};

// 한국어 조건 문구 → 템플릿 키. 위에서부터 먼저 맞는 것을 쓴다.
const CONDITION_PATTERNS: { re: RegExp; key: string; vars: (m: RegExpMatchArray) => Record<string, string> }[] = [
    { re: /^입문 스테이지 (\d+) 클리어$/, key: 'beginnerStageN', vars: m => ({ n: m[1] }) },
    { re: /^하드모드 (\d+)스테이지 클리어$/, key: 'hardNStages', vars: m => ({ n: m[1] }) },
    { re: /^(\d+)스테이지 클리어$/, key: 'nStages', vars: m => ({ n: m[1] }) },
    { re: /^스테이지 (\d+) 클리어$/, key: 'stageN', vars: m => ({ n: m[1] }) },
    { re: /^별 (\d+)개 모으기$/, key: 'starsN', vars: m => ({ n: m[1] }) },
    { re: /^(\d+)년 (\d+)월 오늘의 퍼즐 전부 클리어$/, key: 'dailyMonth', vars: m => ({ month: monthLabel(m[1], m[2]) }) },
];

/** 도전과제 조건 문구. 템플릿에 안 맞거나 번역이 없으면 한국어 원문. */
export function challengeCondition(c: Pick<Challenge, 'condition'>): string {
    for (const p of CONDITION_PATTERNS) {
        const m = c.condition.match(p.re);
        if (!m) continue;
        const tpl = lookup(`challengeConditions.${p.key}`);
        if (!tpl) return c.condition;
        const vars = p.vars(m);
        return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
    }
    return c.condition;
}

/** 테두리 표시 이름. 번역이 없으면 한국어 이름. */
export function frameName(f: Pick<AvatarFrame, 'id' | 'name'>): string {
    return lookup(`frameNames.${f.id}`) ?? f.name;
}
