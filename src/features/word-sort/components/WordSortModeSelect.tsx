import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers } from 'lucide-react';
import { useWordSortProgress } from '../../../context/WordSortProgressContext';
import { useWordSort } from '../context/WordSortContext';
import levelsKo from '../data/levels.json';
import levelsEn from '../data/levels_en.json';
import { i18n } from '../data/i18n';

const WordSortModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { wordSortProgress, isSynced } = useWordSortProgress();
    const { state, dispatch } = useWordSort();
    const { language } = state;
    const t = i18n[language];
    const levels = language === 'en' ? levelsEn : levelsKo;

    const handlePlay = () => {
        if (!isSynced) return;
        const tutorialDone = localStorage.getItem('wordSort_tutorialDone');
        if (!tutorialDone) {
            // New user — game handles tutorial
            navigate('play');
            return;
        }
        const nextLevel = wordSortProgress + 1;
        const levelData = (levels as any[]).find((l) => l.id === nextLevel) || levels[0];
        dispatch({ type: 'START_LEVEL', levelData });
        navigate(`play?level=${nextLevel}`);
    };

    return (
        <>
        <Helmet>
            <title>단어 정렬 카드 게임 - 퍼즐 가든</title>
            <meta name="description" content="카드를 드래그해서 같은 주제의 단어끼리 분류하는 단어 카드 게임. 다양한 주제의 레벨을 무료로 즐기세요." />
            <link rel="canonical" href="https://puzzles.tmhub.co.kr/word-sort" />
            <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"단어 정렬","item":"https://puzzles.tmhub.co.kr/word-sort"}]}`}</script>
            <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"SoftwareApplication","name":"단어 정렬 - 퍼즐 가든","applicationCategory":"GameApplication","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"KRW"}}`}</script>
            <script type="application/ld+json">{`{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "단어 정렬 게임이란 무엇인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "단어 정렬은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 올바른 슬롯에 분류하는 카드 게임입니다. 직관적인 조작과 다양한 주제로 남녀노소 누구나 즐길 수 있습니다."
      }
    },
    {
      "@type": "Question",
      "name": "단어 정렬 게임은 어떻게 하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯으로 드래그합니다. 모든 카드를 올바른 슬롯에 넣으면 레벨 클리어입니다. 틀린 카드는 다시 덱으로 돌아갑니다."
      }
    },
    {
      "@type": "Question",
      "name": "단어 정렬 게임은 무료인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네, 퍼즐 가든의 단어 정렬 게임은 완전 무료입니다. 로그인 없이 바로 시작할 수 있으며 다양한 주제의 레벨을 제공합니다."
      }
    },
    {
      "@type": "Question",
      "name": "단어 정렬 게임이 학습에 도움이 되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네. 단어 카드를 주제별로 분류하면서 어휘력, 연상 능력, 범주화 사고를 동시에 훈련할 수 있습니다. 한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다."
      }
    }
  ]
}`}</script>
        </Helmet>
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>{language === 'ko' ? '단어정렬 모드 선택' : 'Select Game Mode'}</h1>
            </header>

            <div className="mode-grid">
                <div
                    className="game-card animate-fade-in"
                    style={{ '--delay': '0.1s' } as React.CSSProperties}
                    onClick={handlePlay}
                >
                    <div className="game-card-icon">
                        <Layers size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>{language === 'ko' ? '스테이지 모드' : 'Stage Mode'}</h3>
                        <p>{language === 'ko' ? '단어 카드를 같은 카테고리끼리 정렬해 스테이지를 클리어하세요.' : 'Sort word cards into matching categories to clear stages.'}</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {!isSynced
                                    ? (language === 'ko' ? '로딩 중...' : 'Loading...')
                                    : wordSortProgress > 0
                                        ? `Level ${wordSortProgress + 1} ${language === 'ko' ? '이어하기' : 'Resume'}`
                                        : `Level 1 ${language === 'ko' ? '시작하기' : 'Start'}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO 콘텐츠 섹션 */}
            <details style={{ padding: '2rem 1.5rem 3rem', maxWidth: '680px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}>
                <summary style={{
                    fontSize: '1.1rem', fontWeight: 700, color: '#444',
                    cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>▶</span>
                    단어 정렬 게임이란?
                </summary>
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        <strong>단어 정렬</strong>은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 분류하는 <strong>카드 게임</strong>입니다.
                        예를 들어 '사과·바나나·포도'는 과일, '빨강·파랑·노랑'은 색깔 슬롯에 넣는 방식입니다.
                        직관적인 조작과 다양한 주제로 남녀노소 누구나 쉽게 즐길 수 있습니다.
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>게임 방법</h3>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯에 드래그합니다.
                        모든 카드를 올바른 슬롯에 넣으면 레벨 클리어! 틀린 카드는 다시 조정할 수 있습니다.
                        레벨이 올라갈수록 주제 수와 카드 수가 늘어나 더 까다로운 분류 능력이 필요합니다.
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>단어 정렬 게임의 효과</h3>
                    <p style={{ fontSize: '0.9rem' }}>
                        단어 카드 게임은 <strong>어휘력, 연상 능력, 범주화 사고</strong>를 동시에 훈련합니다.
                        한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다.
                        짧은 시간에 집중해서 즐길 수 있는 <strong>무료 두뇌 게임</strong>으로, 매일 새로운 레벨에 도전해보세요.
                    </p>
                </div>
            </details>

        </div>
        </>
    );
};

export default WordSortModeSelect;
