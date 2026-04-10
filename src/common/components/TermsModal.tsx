import React from 'react';
import { X } from 'lucide-react';

export type TermsType = 'service' | 'privacy' | 'finance';

interface TermsModalProps {
    type: TermsType;
    onClose: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>{title}</h3>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.75 }}>
            {typeof children === 'string' ? <p>{children}</p> : children}
        </div>
    </div>
);

const TERMS_CONTENT: Record<TermsType, { title: string; content: React.ReactNode }> = {
    service: {
        title: '서비스 이용약관',
        content: (
            <>
                <Section title="제1조 (목적)">
                    본 약관은 투믹스소프트(이하 "회사")가 운영하는 퍼즐 가든(puzzles.tmhub.co.kr, 이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </Section>
                <Section title="제2조 (정의)">
                    <ol>
                        <li>"서비스"란 회사가 제공하는 웹 기반 퍼즐 게임 서비스 일체를 말합니다.</li>
                        <li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.</li>
                        <li>"코인"이란 서비스 내에서 사용되는 가상의 재화를 말합니다.</li>
                    </ol>
                </Section>
                <Section title="제3조 (약관의 효력 및 변경)">
                    <ol>
                        <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
                        <li>회사는 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 사전 공지합니다.</li>
                    </ol>
                </Section>
                <Section title="제4조 (서비스 이용)">
                    <ol>
                        <li>서비스는 연중무휴 24시간 제공을 원칙으로 하며, 점검 등의 사유로 일시 중단될 수 있습니다.</li>
                        <li>이용자는 관계 법령, 본 약관, 서비스 이용 안내 및 공지사항 등을 준수해야 합니다.</li>
                    </ol>
                </Section>
                <Section title="제5조 (코인 구매 및 환불)">
                    <ol>
                        <li>코인은 서비스 내 결제 수단을 통해 구매할 수 있습니다.</li>
                        <li>구매한 코인은 전자상거래법에 따라 구매일로부터 7일 이내 미사용 시 환불을 요청할 수 있습니다.</li>
                        <li>사용된 코인은 환불되지 않습니다.</li>
                        <li>환불 문의: 고객센터 070-8984-4679</li>
                    </ol>
                </Section>
                <Section title="제6조 (책임 제한)">
                    <ol>
                        <li>회사는 천재지변, 불가항력 등으로 인해 서비스를 제공하지 못한 경우 책임을 지지 않습니다.</li>
                        <li>이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서는 회사가 책임을 지지 않습니다.</li>
                    </ol>
                </Section>
                <Section title="제7조 (분쟁 해결)">
                    서비스 이용과 관련하여 발생한 분쟁에 대해서는 서울중앙지방법원을 관할 법원으로 합니다.
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>시행일: 2024년 1월 1일</p>
            </>
        ),
    },
    privacy: {
        title: '개인정보 처리방침',
        content: (
            <>
                <p style={{ marginBottom: '1rem', lineHeight: 1.7 }}>
                    투믹스소프트(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
                </p>
                <Section title="1. 수집하는 개인정보 항목">
                    <ul>
                        <li>소셜 로그인 이용 시: 이메일 주소, 프로필 사진, 닉네임 (Google/Apple 계정 제공 정보)</li>
                        <li>서비스 이용 시 자동 수집: 기기 정보, 접속 IP, 게임 플레이 기록</li>
                    </ul>
                </Section>
                <Section title="2. 개인정보 수집 및 이용 목적">
                    <ul>
                        <li>회원 식별 및 서비스 제공</li>
                        <li>게임 진행 상황 저장 및 랭킹 관리</li>
                        <li>고객 문의 및 불만 처리</li>
                        <li>서비스 개선 및 신규 서비스 개발</li>
                    </ul>
                </Section>
                <Section title="3. 개인정보 보유 및 이용 기간">
                    <ul>
                        <li>회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.</li>
                        <li>관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
                    </ul>
                </Section>
                <Section title="4. 개인정보 제3자 제공">
                    회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 이용자의 동의가 있거나 법령에 의한 경우는 예외로 합니다.
                </Section>
                <Section title="5. 개인정보 처리 위탁">
                    <ul>
                        <li>Google Firebase (데이터베이스, 인증 서비스): 미국 소재</li>
                    </ul>
                </Section>
                <Section title="6. 이용자의 권리">
                    이용자는 언제든지 개인정보 열람, 수정, 삭제, 처리정지를 요청할 수 있습니다. 문의는 고객센터(070-8984-4679)로 연락하시기 바랍니다.
                </Section>
                <Section title="7. 개인정보 보호책임자">
                    <ul>
                        <li>성명: 김도균</li>
                        <li>연락처: 070-8984-4679</li>
                    </ul>
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>시행일: 2024년 1월 1일</p>
            </>
        ),
    },
    finance: {
        title: '전자금융거래 기본약관',
        content: (
            <>
                <Section title="제1조 (목적)">
                    본 약관은 투믹스소프트(이하 "회사")가 제공하는 전자금융거래 서비스(코인 구매 등)의 이용과 관련하여 회사와 이용자 간의 권리·의무를 규정함을 목적으로 합니다.
                </Section>
                <Section title="제2조 (전자금융거래 서비스의 종류)">
                    <ul>
                        <li>코인 구매 결제 (신용카드, 간편결제 등)</li>
                    </ul>
                </Section>
                <Section title="제3조 (거래 내용의 확인)">
                    <ol>
                        <li>회사는 이용자가 전자금융거래의 내용을 확인할 수 있도록 거래 내역을 제공합니다.</li>
                        <li>이용자는 거래 완료 후 이메일 또는 서비스 내 알림으로 거래 내역을 확인할 수 있습니다.</li>
                    </ol>
                </Section>
                <Section title="제4조 (오류의 정정)">
                    <ol>
                        <li>이용자는 전자금융거래 처리 과정에서 오류 발생 시 즉시 회사에 정정을 요청할 수 있습니다.</li>
                        <li>회사는 오류 사실을 인지한 즉시 이를 조사하고, 조사 결과를 이용자에게 통지합니다.</li>
                    </ol>
                </Section>
                <Section title="제5조 (환불 및 취소)">
                    <ol>
                        <li>코인 구매 후 7일 이내, 미사용 상태인 경우 전액 환불을 요청할 수 있습니다.</li>
                        <li>일부 사용된 코인은 사용분을 제외한 잔여분에 대해 환불이 가능합니다.</li>
                        <li>환불 요청: 고객센터 070-8984-4679</li>
                    </ol>
                </Section>
                <Section title="제6조 (회사의 책임)">
                    <ol>
                        <li>회사는 전자금융거래가 안전하게 처리될 수 있도록 선량한 관리자로서의 주의를 다합니다.</li>
                        <li>회사는 이용자의 귀책 사유 없이 발생한 손해에 대해 배상 책임을 집니다.</li>
                    </ol>
                </Section>
                <Section title="제7조 (분쟁 처리 및 고충 처리)">
                    전자금융거래와 관련한 분쟁 또는 불만 사항은 아래로 문의하시기 바랍니다.
                    <ul style={{ marginTop: '0.5rem' }}>
                        <li>고객센터: 070-8984-4679</li>
                        <li>금융감독원 분쟁조정: 1332</li>
                    </ul>
                </Section>
                <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>시행일: 2024년 1월 1일</p>
            </>
        ),
    },
};

const TermsModal: React.FC<TermsModalProps> = ({ type, onClose }) => {
    const { title, content } = TERMS_CONTENT[type];

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
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
