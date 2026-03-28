import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Timer, Layers, ChevronLeft, BookOpen } from 'lucide-react';
import { useGame } from '../context/SudokuContext';
import { useSudokuProgress } from '../../../context/SudokuProgressContext';

const SudokuModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { dispatch } = useGame();
    const { stageProgress } = useSudokuProgress();
    const [testLevel, setTestLevel] = useState<string>('40');
    const beginnerProgress = parseInt(localStorage.getItem('beginner_progress') || '1', 10);
    const beginnerAllCleared = !!localStorage.getItem('beginner_all_cleared');

    const handleTestPlay = () => {
        const level = parseInt(testLevel, 10);
        if (!isNaN(level) && level > 0) {
            dispatch({ type: 'START_STAGE', level });
            navigate(`/sudoku/stage?mode=stage&level=${level}`);
        }
    };

    return (
        <>
        <Helmet>
            <title>스도쿠 무료 온라인 게임 - 퍼즐 가든</title>
            <meta name="description" content="9×9 격자에 1~9 숫자를 채우는 클래식 두뇌 퍼즐! 쉬움부터 어려움까지 다양한 난이도의 스도쿠를 무료로 즐기세요." />
            <link rel="canonical" href="https://puzzles.tmhub.co.kr/sudoku" />
            <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"스도쿠","item":"https://puzzles.tmhub.co.kr/sudoku"}]}`}</script>
            <script type="application/ld+json">{`{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "스도쿠란 무엇인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "스도쿠(Sudoku)는 9×9 격자에 1부터 9까지의 숫자를 채우는 논리 퍼즐입니다. 각 가로줄, 세로줄, 3×3 박스 안에 같은 숫자가 두 번 들어갈 수 없습니다. 수학 실력이 아닌 순수한 논리력으로 푸는 두뇌 게임입니다."
      }
    },
    {
      "@type": "Question",
      "name": "스도쿠는 무료로 즐길 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네, 퍼즐 가든의 스도쿠는 완전 무료입니다. 회원가입 없이 바로 플레이할 수 있으며 초보부터 어려움까지 다양한 난이도를 제공합니다."
      }
    },
    {
      "@type": "Question",
      "name": "스도쿠 초보자는 어떤 난이도부터 시작해야 하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "처음이라면 '초보 스도쿠' 모드를 추천합니다. 단계별로 난이도가 올라가며 차근차근 실력을 쌓을 수 있습니다. 어느 정도 익숙해지면 타임어택 모드로 도전해보세요."
      }
    },
    {
      "@type": "Question",
      "name": "스도쿠가 두뇌에 좋은가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네. 스도쿠는 집중력, 논리적 사고력, 단기 기억력 향상에 효과적입니다. 하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 된다고 알려져 있습니다."
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
                <h1>스도쿠 모드 선택</h1>
            </header>

            <div className="mode-grid">
                <div className="game-card animate-fade-in" style={{ '--delay': '0.1s', position: 'relative' } as any} onClick={() => {
                    const startLevel = beginnerAllCleared ? 1 : Math.min(beginnerProgress + 1, 5);
                    dispatch({ type: 'START_BEGINNER', level: startLevel });
                    navigate(`/sudoku/beginner?level=${startLevel}`);
                }}>
                    <div className="game-card-icon">
                        <BookOpen size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            입문자 모드
                            {beginnerAllCleared && (
                                <img src="/clearBadge.png" alt="클리어" style={{ width: '36px', height: '36px' }} />
                            )}
                        </h3>
                        <p>6×6 스도쿠로 시작해 9×9로 단계별 입문하세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {beginnerAllCleared ? '처음부터 하기' : beginnerProgress > 0 ? `Level ${beginnerProgress + 1} 시작하기` : 'Level 1 시작하기'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="game-card animate-fade-in" style={{ '--delay': '0.3s' } as any} onClick={() => {
                    dispatch({ type: 'START_STAGE', level: stageProgress });
                    navigate(`/sudoku/stage?mode=stage&level=${stageProgress}`);
                }}>
                    <div className="game-card-icon">
                        <Layers size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>스테이지 모드</h3>
                        <p>점점 어려워지는 스테이지를 클리어하며 실력을 쌓으세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {stageProgress > 1 ? `Level ${stageProgress} 이어하기` : `Level 1 시작하기`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="game-card animate-fade-in" style={{ '--delay': '0.4s' } as any} onClick={() => navigate('/sudoku/time-attack')}>
                    <div className="game-card-icon">
                        <Timer size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>타임어택 모드</h3>
                        <p>최대한 빨리 퍼즐을 완성하고 다른 플레이어와 기록을 경루세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">플레이</span>
                        </div>
                    </div>
                </div>
            </div>

            {window.location.hostname === 'localhost' && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ margin: 0 }}>테스트용 레벨 바로가기</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="number"
                            value={testLevel}
                            onChange={(e) => setTestLevel(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '80px', textAlign: 'center' }}
                            placeholder="레벨 번호"
                        />
                        <button
                            onClick={handleTestPlay}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            플레이
                        </button>
                    </div>
                </div>
            )}

            {/* SEO 콘텐츠 섹션 */}
            <details style={{ padding: '2rem 1.5rem 3rem', maxWidth: '680px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}>
                <summary style={{
                    fontSize: '1.1rem', fontWeight: 700, color: '#444',
                    cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>▶</span>
                    스도쿠란? — 무료 온라인 스도쿠 게임
                </summary>
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        <strong>스도쿠(Sudoku)</strong>는 9×9 격자를 숫자로 채우는 논리 퍼즐 게임입니다.
                        각 가로줄, 세로줄, 3×3 박스 안에 1부터 9까지 숫자가 한 번씩만 들어가야 합니다.
                        수학 실력이 필요 없고 순수한 논리력과 집중력으로 풀 수 있어 전 세계적으로 사랑받는 <strong>두뇌 퍼즐 게임</strong>입니다.
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>스도쿠 하는 법</h3>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        빈 칸을 클릭하고 1~9 숫자 중 조건에 맞는 숫자를 입력합니다.
                        같은 행·열·박스에 이미 있는 숫자는 다시 쓸 수 없습니다.
                        힌트 기능을 활용하면 막힌 곳을 확인할 수 있습니다. 처음이라면 <strong>초보 스도쿠</strong> 또는 <strong>쉬운 난이도</strong>부터 시작해보세요.
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>난이도 선택 가이드</h3>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        <strong>입문 · 쉬움</strong> — 스도쿠를 처음 접하는 분들을 위한 단계. 힌트가 많이 제공됩니다.<br />
                        <strong>보통</strong> — 기본 규칙을 익혔다면 도전. 논리적 추론이 필요합니다.<br />
                        <strong>어려움 · 타임어택</strong> — 제한 시간 내에 완성하는 스피드 도전 모드. 고수를 위한 단계입니다.
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>스도쿠의 두뇌 훈련 효과</h3>
                    <p style={{ fontSize: '0.9rem' }}>
                        스도쿠는 <strong>집중력, 논리적 사고, 단기 기억력</strong> 향상에 효과적입니다.
                        하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 된다는 연구 결과가 있습니다.
                        퍼즐 가든의 무료 온라인 스도쿠로 매일 두뇌를 자극해보세요.
                    </p>
                </div>
            </details>

        </div>
        </>
    );
};

export default SudokuModeSelect;
