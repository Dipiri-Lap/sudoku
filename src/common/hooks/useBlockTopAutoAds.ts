import { useEffect, type RefObject } from 'react';

/**
 * AdSense 자동 광고(in-page)가 페이지 콘텐츠 "위"에 끼어드는 것을 막는다.
 *
 * 자동 광고는 `.google-auto-placed` 컨테이너를 DOM 에 직접 삽입한다.
 * 기준 요소(containerRef)보다 문서 순서상 앞에 들어온 것만 제거하고,
 * 콘텐츠 안/아래에 붙는 광고와 하단 앵커 광고(body 끝에 붙음)는 그대로 둔다.
 */
export function useBlockTopAutoAds(containerRef: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const removeIfAbove = (el: Element) => {
            const container = containerRef.current;
            if (!container || !el.isConnected) return;
            if (el.contains(container)) return;
            // 기준 요소보다 앞(위)에 있는 광고만 제거
            if (container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) {
                el.remove();
            }
        };

        const sweep = (root: ParentNode) => {
            root.querySelectorAll('.google-auto-placed').forEach(removeIfAbove);
        };

        sweep(document);

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (!(node instanceof Element)) return;
                    if (node.classList.contains('google-auto-placed')) removeIfAbove(node);
                    else sweep(node);
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [containerRef]);
}
