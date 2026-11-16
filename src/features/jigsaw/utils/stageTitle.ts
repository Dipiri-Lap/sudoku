import i18n from '../../../i18n';
import type { JigsawStage } from '../data/stages';

/**
 * Display title of a stage. English names live in locales/en/jigsaw.json under `stageTitles.<stageId>`
 * (stages.ts keeps the Korean title as the source). A stage without an entry — e.g. one added later —
 * simply shows its Korean title, so new stages never break.
 */
export function stageTitle(stage: JigsawStage): string {
    // 현재 언어 → 대체 언어 순(ja 는 en 으로)으로 찾는다.
    for (const lng of i18n.languages ?? [i18n.language]) {
        const v: unknown = i18n.getResource(lng, 'jigsaw', `stageTitles.${stage.id}`);
        if (typeof v === 'string' && v) return v;
    }
    return stage.title;
}
