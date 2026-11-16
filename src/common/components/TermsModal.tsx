import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { paidCoinsEnabled, isKo } from '../../i18n/locale';
import { X } from 'lucide-react';

export type TermsType = 'service' | 'privacy' | 'finance';

interface TermsModalProps {
    type: TermsType;
    onClose: () => void;
}

const KAKAO_OPEN_CHAT_URL = 'https://open.kakao.com/o/sd3A2bCi';

const ContactLink: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation('modals');
    return (
    <a
        href={KAKAO_OPEN_CHAT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#60a5fa', textDecoration: 'underline' }}
    >
        {children ?? t('terms.contactLink')}
    </a>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>{title}</h3>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.75 }}>
            {typeof children === 'string' ? <p>{children}</p> : children}
        </div>
    </div>
);

const contactComponents = { contact: <ContactLink /> };

const buildTermsContent = (t: TFunction<'modals'>): Record<TermsType, { title: string; content: React.ReactNode }> => ({
    service: {
        title: t('terms.title.service'),
        content: (
            <>
                <Section title={t('terms.service.purpose.title')}>
                    {t('terms.service.purpose.body')}
                </Section>
                <Section title={t('terms.service.definitions.title')}>
                    <ol>
                        <li>{t('terms.service.definitions.i1')}</li>
                        <li>{t('terms.service.definitions.i2')}</li>
                        <li>{t('terms.service.definitions.i3')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.service.changes.title')}>
                    <ol>
                        <li>{t('terms.service.changes.i1')}</li>
                        <li>{t('terms.service.changes.i2')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.service.use.title')}>
                    <ol>
                        <li>{t('terms.service.use.i1')}</li>
                        <li>{t('terms.service.use.i2')}</li>
                    </ol>
                </Section>
                {paidCoinsEnabled && (
                    <Section title={t('terms.service.refund.title')}>
                        <ol>
                            <li>{t('terms.service.refund.i1')}</li>
                            <li>{t('terms.service.refund.i2')}</li>
                            <li>{t('terms.service.refund.i3')}</li>
                            <li><Trans t={t} i18nKey="terms.service.refund.i4" components={contactComponents} /></li>
                        </ol>
                    </Section>
                )}
                <Section title={t('terms.service.liability.title')}>
                    <ol>
                        <li>{t('terms.service.liability.i1')}</li>
                        <li>{t('terms.service.liability.i2')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.service.disputes.title')}>
                    {t('terms.service.disputes.body')}
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{t('terms.effective')}</p>
            </>
        ),
    },
    privacy: {
        title: t('terms.title.privacy'),
        content: (
            <>
                <p style={{ marginBottom: '1rem', lineHeight: 1.7 }}>
                    {t('terms.privacy.intro')}
                </p>
                <Section title={t('terms.privacy.collect.title')}>
                    <ul>
                        <li>{t('terms.privacy.collect.i1')}</li>
                        <li>{t('terms.privacy.collect.i2')}</li>
                    </ul>
                </Section>
                <Section title={t('terms.privacy.purpose.title')}>
                    <ul>
                        <li>{t('terms.privacy.purpose.i1')}</li>
                        <li>{t('terms.privacy.purpose.i2')}</li>
                        <li>{t('terms.privacy.purpose.i3')}</li>
                        <li>{t('terms.privacy.purpose.i4')}</li>
                    </ul>
                </Section>
                <Section title={t('terms.privacy.retention.title')}>
                    <ul>
                        <li>{t('terms.privacy.retention.i1')}</li>
                        <li>{t('terms.privacy.retention.i2')}</li>
                    </ul>
                </Section>
                <Section title={t('terms.privacy.thirdParty.title')}>
                    {t('terms.privacy.thirdParty.body')}
                </Section>
                <Section title={t('terms.privacy.outsourcing.title')}>
                    <p style={{ marginBottom: '0.5rem' }}>{t('terms.privacy.outsourcing.intro')}</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#e2e8f0' }}>{t('terms.privacy.outsourcing.colVendor')}</th>
                                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#e2e8f0' }}>{t('terms.privacy.outsourcing.colTask')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={paidCoinsEnabled ? { borderBottom: '1px solid rgba(255,255,255,0.07)' } : undefined}>
                                <td style={{ padding: '0.3rem 0.5rem' }}>Google Firebase</td>
                                <td style={{ padding: '0.3rem 0.5rem' }}>{t('terms.privacy.outsourcing.firebaseTask')}</td>
                            </tr>
                            {paidCoinsEnabled && (
                                <tr>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>{t('terms.privacy.outsourcing.portoneName')}</td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>{t('terms.privacy.outsourcing.portoneTask')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Section>
                {/* 광고 쿠키 고지(애드센스 정책상 필수) — 모든 언어에 표시 */}
                <Section title={t('terms.privacy.cookies.title')}>
                    <ul>
                        <li>{t('terms.privacy.cookies.i1')}</li>
                        <li>{t('terms.privacy.cookies.i2')}</li>
                        <li>{t('terms.privacy.cookies.i3')}</li>
                        <li>{t('terms.privacy.cookies.i4')}</li>
                    </ul>
                </Section>
                {/* 해외 이용자 권리(GDPR/CCPA) — 해외판에만 표시 */}
                {!isKo && (
                    <>
                        <Section title={t('terms.privacy.international.title')}>
                            <ul>
                                <li>{t('terms.privacy.international.i1')}</li>
                                <li>{t('terms.privacy.international.i2')}</li>
                                <li>{t('terms.privacy.international.i3')}</li>
                                <li>{t('terms.privacy.international.i4')}</li>
                            </ul>
                        </Section>
                    </>
                )}
                <Section title={t('terms.privacy.rights.title')}>
                    <Trans t={t} i18nKey="terms.privacy.rights.body" components={contactComponents} />
                </Section>
                <Section title={t('terms.privacy.officer.title')}>
                    <ul>
                        <li>{t('terms.privacy.officer.name')}</li>
                        <li><Trans t={t} i18nKey="terms.privacy.officer.contact" components={contactComponents} /></li>
                    </ul>
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{t('terms.effective')}</p>
            </>
        ),
    },
    finance: {
        title: t('terms.title.finance'),
        content: (
            <>
                <Section title={t('terms.finance.purpose.title')}>
                    {t('terms.finance.purpose.body')}
                </Section>
                <Section title={t('terms.finance.kinds.title')}>
                    <ul>
                        <li>{t('terms.finance.kinds.i1')}</li>
                    </ul>
                </Section>
                <Section title={t('terms.finance.confirm.title')}>
                    <ol>
                        <li>{t('terms.finance.confirm.i1')}</li>
                        <li>{t('terms.finance.confirm.i2')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.finance.errors.title')}>
                    <ol>
                        <li>{t('terms.finance.errors.i1')}</li>
                        <li>{t('terms.finance.errors.i2')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.finance.refund.title')}>
                    <ol>
                        <li>{t('terms.finance.refund.i1')}</li>
                        <li>{t('terms.finance.refund.i2')}</li>
                        <li><Trans t={t} i18nKey="terms.finance.refund.i3" components={contactComponents} /></li>
                    </ol>
                </Section>
                <Section title={t('terms.finance.liability.title')}>
                    <ol>
                        <li>{t('terms.finance.liability.i1')}</li>
                        <li>{t('terms.finance.liability.i2')}</li>
                    </ol>
                </Section>
                <Section title={t('terms.finance.complaints.title')}>
                    {t('terms.finance.complaints.intro')}
                    <ul style={{ marginTop: '0.5rem' }}>
                        <li><Trans t={t} i18nKey="terms.finance.complaints.center" components={contactComponents} /></li>
                        <li>{t('terms.finance.complaints.fss')}</li>
                    </ul>
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{t('terms.effective')}</p>
            </>
        ),
    },
});

const TermsModal: React.FC<TermsModalProps> = ({ type, onClose }) => {
    const { t } = useTranslation('modals');
    const { title, content } = buildTermsContent(t)[type];

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 3000,
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.25rem',
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div style={{
                    padding: '1.25rem',
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {content}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.75rem 1.25rem', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '0.7rem',
                            borderRadius: '10px',
                            background: '#475569',
                            border: 'none', color: 'white',
                            fontSize: '0.9rem', fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        {t('terms.ok')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
