import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dismissPushPrompt, enablePush, shouldAskPush } from '../../../services/pushNotification';

type Phase = 'hidden' | 'ask' | 'working' | 'done' | 'denied' | 'error';

/**
 * 오늘의 퍼즐을 클리어한 직후(만족한 순간)에만 "내일 새 퍼즐 알려드릴까요?"를 묻는다.
 * 이미 허용·차단했거나 최근에 "나중에"를 눌렀다면 아무것도 보이지 않는다.
 */
const DailyPushPrompt: React.FC = () => {
    const { t } = useTranslation('daily');
    const [phase, setPhase] = useState<Phase>('hidden');

    useEffect(() => {
        let alive = true;
        shouldAskPush().then(ok => { if (alive && ok) setPhase('ask'); });
        return () => { alive = false; };
    }, []);

    if (phase === 'hidden') return null;

    const accept = async () => {
        setPhase('working');
        const result = await enablePush();
        if (result === 'granted') setPhase('done');
        else if (result === 'denied') setPhase('denied');
        else setPhase('error');
    };

    const later = () => {
        dismissPushPrompt();
        setPhase('hidden');
    };

    const box: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box', borderRadius: 14, padding: '0.7rem 0.9rem',
        background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e3a8a', textAlign: 'center',
        fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.5,
    };

    if (phase === 'done') return <div style={box}>{t('push.done')}</div>;
    if (phase === 'denied') return <div style={{ ...box, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569' }}>{t('push.denied')}</div>;
    if (phase === 'error') return <div style={{ ...box, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>{t('push.error')}</div>;

    return (
        <div style={box}>
            <div>{t('push.ask')}</div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.55rem' }}>
                <button
                    onClick={accept}
                    disabled={phase === 'working'}
                    style={{ padding: '0.4rem 1rem', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                    {phase === 'working' ? t('push.working') : t('push.accept')}
                </button>
                <button
                    onClick={later}
                    disabled={phase === 'working'}
                    style={{ padding: '0.4rem 1rem', borderRadius: 10, border: '1px solid #93c5fd', background: 'white', color: '#1e3a8a', fontWeight: 700, cursor: 'pointer' }}
                >
                    {t('push.later')}
                </button>
            </div>
        </div>
    );
};

export default DailyPushPrompt;
