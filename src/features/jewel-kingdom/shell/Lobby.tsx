import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { playSfx, unlockAudio } from '../ui/sound';
import { DEFAULT_CHARACTER } from '../data/characters';
import { stageLevel } from '../ui/JewelKingdomGame';
import {
  DAILY_REWARDS,
  MAX_LIVES,
  SEASON_GOAL,
  canClaimDaily,
  claimDaily,
  dailyIndex,
  endOfMonth,
  endOfWeek,
  formatCountdown,
  timeLeftLabel,
  type Profile,
} from './profile';
import GoalIcon from './GoalIcon';
import SettingsModal from './SettingsModal';
import ScaledStage from './ScaledStage';
import FarmScene from './FarmScene';
import { CROPS, FARM_LAWN, farmStage, finishCost, nextFarmStage, type Plot } from './farm';
import type { PlotState } from './FarmScene';

/**
 * 로비(홈). 로얄매치류 로비 배치를 따랐다:
 *  - 맨 위 가로 줄: 코인(+) | 가운데 캐릭터 초상화(장식 액자 + 이름 리본) | 하트·설정
 *    (씨앗 칸은 좁은 폰에서 숫자가 잘려 뺐다 - 씨앗 이벤트를 붙일 때 그 이벤트 창에서 보여 준다)
 *  - 양옆: 기간 한정 이벤트 아이콘(남은 시간·진행 배지)
 *  - 아래 줄: 수집 · 큰 "레벨 N" · 미션(0/8)
 *  - 맨 아래 탭 5개: 상점 · 랭킹 · 홈 · 팀 · 시즌(고른 탭이 금테 칸으로 솟는다)
 * 출석·상점(하트 채우기)·시작 전 창·설정은 동작하고, 나머지는 누르면 "준비 중".
 */

type Tab = 'shop' | 'rank' | 'home' | 'team' | 'season';
type Modal = null | 'prelevel' | 'settings' | 'daily' | 'nolives' | 'collection' | 'farm' | { soon: string } | { plot: Plot };

/** 하트 가득 채우기 가격 */
const REFILL_COST = 900;
const TIER_LABEL: Record<string, string> = { hard: '어려운 판', super: '아주 어려운 판' };
/** 로비 아이콘(플레이 화면과 같은 3D 화풍). generated-images/lobby-ui에서 만들어 줄였다 */
const ICON = (name: string) => `/assets/3match/lobby/${name}.webp`;

interface Props {
  profile: Profile;
  setProfile: (f: (p: Profile) => Profile) => void;
  stage: number;
  /** 하트가 없으면 false */
  onPlay: () => boolean;
}

const Lobby: React.FC<Props> = ({ profile, setProfile, stage, onPlay }) => {
  const [tab, setTab] = useState<Tab>('home');
  const [modal, setModal] = useState<Modal>(null);
  const level = stageLevel(stage);
  const dailyReady = canClaimDaily(profile);
  const full = profile.lives >= MAX_LIVES;
  const close = () => setModal(null);
  const soon = (name: string) => setModal({ soon: name });
  const next = nextFarmStage(profile.farm);
  /** 방금 수확한 밭(코인이 떠오르는 연출) */
  const [harvested, setHarvested] = useState<{ id: string; coins: number; at: number } | null>(null);

  const onPlot = (p: Plot, st: PlotState) => {
    if (st === 'empty') {
      setProfile(q => ({ ...q, plots: { ...q.plots, [p.id]: Date.now() } }));
      playSfx('dig');
    } else if (st === 'ripe') {
      const coins = CROPS[p.crop].reward;
      setProfile(q => {
        const plots = { ...q.plots };
        delete plots[p.id];
        return { ...q, coins: q.coins + coins, plots };
      });
      setHarvested({ id: p.id, coins, at: Date.now() });
      playSfx('pop');
    } else {
      setModal({ plot: p });
    }
  };
  const weekLeft = timeLeftLabel(endOfWeek());
  const monthLeft = timeLeftLabel(endOfMonth());

  const refill = () => {
    if (profile.coins < REFILL_COST) return false;
    setProfile(p => ({ ...p, coins: p.coins - REFILL_COST, lives: MAX_LIVES, nextLifeAt: null }));
    return true;
  };

  return (
    <ScaledStage className={`pg-lobby tab-${tab}`} onPointerDown={unlockAudio} style={{ ['--lawn' as string]: FARM_LAWN }}>
      {/* 가운데 농장 장면: 별로 다음 단계를 열면 그림이 통째로 자란다. 다른 UI보다 뒤에 깔린다 */}
      <FarmScene
        stage={profile.farm}
        plots={profile.plots}
        onPlot={onPlot}
        harvested={tab === 'home' ? harvested : null}
        onBuilt={() => playSfx('chime')}
      />

      {/* ── 맨 위 가로 줄: [코인] [캐릭터 초상화] [하트·설정] ── */}
      <div className="pg-topstrip">
        <div className="pg-topside left">
          <button className="pg-chip" onClick={() => setTab('shop')}>
            <span className="pg-coin" aria-hidden />
            <b>{profile.coins.toLocaleString()}</b>
            <Plus className="pg-chip-plus" size={14} strokeWidth={4} />
          </button>
        </div>

        {/* 가운데 초상화: 장식 액자 + 이름 리본, 줄 아래로 늘어뜨린다 */}
        <div className="pg-hero">
          <button className="pg-hero-frame" onClick={() => soon('프로필')} aria-label="프로필">
            <span className="pg-hero-window">
              <img className="pg-hero-pic" src={DEFAULT_CHARACTER.face} alt="" draggable={false} />
            </span>
            <img className="pg-hero-border" src={ICON('hero-frame')} alt="" draggable={false} />
            <span className="pg-hero-name">{DEFAULT_CHARACTER.name}</span>
          </button>
        </div>

        <div className="pg-topside right">
          <button className="pg-chip" onClick={() => setModal('nolives')}>
            <img className="pg-chip-img" src={ICON('heart')} alt="" />
            <b>{full ? profile.lives : profile.nextLifeAt ? formatCountdown(profile.nextLifeAt - Date.now()) : profile.lives}</b>
            {!full && <i className="pg-chip-count">{profile.lives}</i>}
          </button>
          <button className="pg-gear" onClick={() => setModal('settings')} aria-label="설정">
            <img src={ICON('gear')} alt="" />
          </button>
        </div>
      </div>

      {tab === 'home' && (
        <>
          {/* ── 양옆 이벤트 ── */}
          <div className="pg-events left">
            <EventIcon label={dailyReady ? '받기!' : '출석'} hot={dailyReady} dot={dailyReady} tone="green" onClick={() => setModal('daily')}>
              <img src={ICON('calendar')} alt="" />
            </EventIcon>
            <EventIcon label={weekLeft} tone="teal" onClick={() => soon('도토리 모으기')}>
              <img src="/assets/3match/items/acorn-bundle.png" alt="" />
            </EventIcon>
          </div>
          <div className="pg-events right">
            <EventIcon label={monthLeft} tone="red" count={6} onClick={() => soon('정원 대회')}>
              <img src="/assets/3match/items/watering-can.png" alt="" />
            </EventIcon>
            <EventIcon label="0/25" tone="blue" onClick={() => soon('친구 선물')}>
              <img src="/assets/3match/items/scarecrow.png" alt="" />
            </EventIcon>
            <EventIcon label={weekLeft} tone="purple" onClick={() => soon('버섯 코인')}>
              <img src="/assets/3match/blockers/mushroom.png" alt="" />
            </EventIcon>
          </div>

          {/* ── 농장 다음 단계 버튼(레벨 버튼 바로 위) ── */}
          {next && (
            <button className={`pg-farm-next${profile.stars >= next.cost ? ' ready' : ''}`} onClick={() => setModal('farm')}>
              <span className="pg-farm-next-name">{next.name}</span>
              <span className="pg-farm-next-cost">
                <img src="/assets/3match/fx/star.png" alt="" />
                {profile.stars}/{next.cost}
              </span>
            </button>
          )}

          {/* ── 아래 줄: 수집 · 레벨 · 미션 ── */}
          <div className="pg-actions">
            <button className="pg-pedestal" onClick={() => setModal('collection')}>
              <span className="pg-pedestal-ico">
                <img src={ICON('cards')} alt="" />
              </span>
              <span className="pg-pedestal-label">수집</span>
            </button>
            <button
              className={`pg-play${level.tier ? ` tier-${level.tier}` : ''}`}
              onClick={() => {
                playSfx('swap');
                setModal('prelevel');
              }}
            >
              <span className="pg-play-label">레벨 {stage}</span>
              {level.tier && TIER_LABEL[level.tier] && <span className="pg-play-badge">{TIER_LABEL[level.tier]}</span>}
            </button>
            <button className="pg-pedestal" onClick={() => soon('미션')}>
              <span className="pg-pedestal-ico">
                <img src={ICON('scroll')} alt="" />
                <i className="pg-count red">1</i>
              </span>
              <span className="pg-pedestal-label">0/8</span>
            </button>
          </div>
        </>
      )}

      {tab === 'shop' && (
        <div className="pg-panel">
          <h2>상점</h2>
          <div className="pg-shop-row">
            <img className="pg-shop-ico" src={ICON('heart')} alt="" />
            <span>하트 가득 채우기</span>
            <button disabled={full || profile.coins < REFILL_COST} onClick={refill}>
              <span className="pg-coin small" aria-hidden /> {REFILL_COST}
            </button>
          </div>
          {[
            ['코인 한 줌', '1,000'],
            ['코인 자루', '5,000'],
            ['부스터 꾸러미', ''],
            ['광고 제거', ''],
          ].map(([name, amount]) => (
            <div key={name} className="pg-shop-row">
              {amount ? <span className="pg-coin" aria-hidden /> : <img className="pg-shop-ico" src={ICON('chest')} alt="" />}
              <span>
                {name} <small>{amount}</small>
              </span>
              <button disabled>준비 중</button>
            </div>
          ))}
        </div>
      )}

      {(tab === 'rank' || tab === 'team' || tab === 'season') && (
        <div className="pg-panel">
          <h2>{{ rank: '랭킹', team: '팀', season: '시즌 패스' }[tab]}</h2>
          {tab === 'season' && (
            <p>
              판을 깰 때마다 별 100개. 별 {SEASON_GOAL.toLocaleString()}개를 모으면 시즌 상자를 열어요. (남은 기간 {monthLeft})
            </p>
          )}
          <p>준비 중이에요. 곧 만나요!</p>
        </div>
      )}

      {/* ── 맨 아래 탭 ── */}
      <nav className="pg-nav">
        <NavButton tab="shop" cur={tab} set={setTab} label="상점">
          <img src={ICON('nav-shop')} alt="" />
        </NavButton>
        <NavButton tab="rank" cur={tab} set={setTab} label="랭킹">
          <img src={ICON('nav-trophy')} alt="" />
        </NavButton>
        <NavButton tab="home" cur={tab} set={setTab} label="홈">
          <img src={ICON('nav-home')} alt="" />
        </NavButton>
        <NavButton tab="team" cur={tab} set={setTab} label="팀">
          <img src={ICON('nav-team')} alt="" />
        </NavButton>
        <NavButton tab="season" cur={tab} set={setTab} label="시즌">
          <img src={ICON('nav-season')} alt="" />
        </NavButton>
      </nav>

      {/* ── 창들 ── */}
      {modal === 'prelevel' && (
        <ModalShell onClose={close}>
          <h2>레벨 {stage}</h2>
          {level.tier && TIER_LABEL[level.tier] && <p className="pg-tier-note">{TIER_LABEL[level.tier]}</p>}
          <div className="pg-goals">
            {level.goals.map((g, i) => (
              <div key={i} className="pg-goal">
                <GoalIcon goal={g} />
                <b>{g.count}</b>
              </div>
            ))}
          </div>
          <p className="pg-moves">{level.moves}수 안에 모으세요</p>
          <div className="pg-preboost">
            {['rocket', 'tnt', 'lightball'].map(k => (
              <button key={k} className="pg-preboost-slot" onClick={() => soon('시작 부스터')}>
                <img src={`/assets/3match/items/${k}.png`} alt="" />
                <span>준비 중</span>
              </button>
            ))}
          </div>
          <div className="jk-modal-actions">
            <button
              className="primary"
              onClick={() => {
                if (!onPlay()) setModal('nolives');
              }}
            >
              시작!
            </button>
          </div>
        </ModalShell>
      )}

      {modal === 'nolives' && (
        <ModalShell onClose={close}>
          <h2>하트</h2>
          <div className="pg-hearts">
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <img key={i} className={`pg-heart-big${i < profile.lives ? '' : ' empty'}`} src={ICON('heart')} alt="" />
            ))}
          </div>
          <p>
            {full
              ? '하트가 가득 찼어요'
              : `다음 하트까지 ${profile.nextLifeAt ? formatCountdown(profile.nextLifeAt - Date.now()) : '--:--'}`}
          </p>
          <div className="jk-modal-actions">
            <button className="primary" disabled={full || profile.coins < REFILL_COST} onClick={() => refill() && close()}>
              가득 채우기 <small>🪙 {REFILL_COST}</small>
            </button>
            <button onClick={close}>{full ? '확인' : '기다릴게요'}</button>
          </div>
        </ModalShell>
      )}

      {modal === 'daily' && (
        <ModalShell onClose={close}>
          <h2>출석 보상</h2>
          <div className="pg-daily">
            {DAILY_REWARDS.map((r, i) => {
              // 이번 7일 주기에서 이미 받은 칸 수. 오늘 받았으면 오늘 칸까지 받은 것으로 친다
              const claimed = dailyReady ? dailyIndex(profile) : ((profile.dailyStreak - 1) % DAILY_REWARDS.length) + 1;
              const got = i < claimed;
              const now = dailyReady && i === claimed;
              return (
                <div key={i} className={`pg-day${got ? ' got' : ''}${now ? ' now' : ''}${i === 6 ? ' big' : ''}`}>
                  <small>{i + 1}일</small>
                  <span className="pg-coin" aria-hidden />
                  <b>{r}</b>
                </div>
              );
            })}
          </div>
          <div className="jk-modal-actions">
            <button
              className="primary"
              disabled={!dailyReady}
              onClick={() => {
                setProfile(claimDaily);
                playSfx('win');
                close();
              }}
            >
              {dailyReady ? '받기' : '내일 또 만나요'}
            </button>
          </div>
        </ModalShell>
      )}

      {modal === 'collection' && (
        <ModalShell onClose={close}>
          <h2>수집</h2>
          <p>판을 깨며 채소 카드를 모으는 자리예요. (준비 중)</p>
          <div className="pg-collection">
            {[0, 1, 2, 3, 4, 5].map(c => (
              <div key={c} className="pg-card">
                <img src={`/assets/3match/gems/gem-${c}.png`} alt="" />
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {modal === 'settings' && (
        <SettingsModal
          onClose={close}
          onReset={() => setProfile(p => ({ ...p, stage: 1 }))}
          onDevStars={() => setProfile(p => ({ ...p, stars: p.stars + 10 }))}
          onDevBuildAll={() => setProfile(p => (nextFarmStage(p.farm) ? { ...p, farm: p.farm + 1 } : p))}
          onDevRipen={() =>
            setProfile(p => ({
              ...p,
              plots: Object.fromEntries(Object.keys(p.plots).map(k => [k, 0])),
            }))
          }
        />
      )}

      {modal === 'farm' && next && (
        <ModalShell onClose={close}>
          <h2>{next.name}</h2>
          <p className="pg-build-area">{next.desc}</p>
          <div className="pg-farm-preview">
            <img src={farmStage(profile.farm).img} alt="지금" />
            <span>▶</span>
            <img src={next.img} alt="다음" />
          </div>
          <p className="pg-build-have">
            가진 별 <img src="/assets/3match/fx/star.png" alt="" /> <b>{profile.stars}</b>
          </p>
          <div className="jk-modal-actions">
            <button
              className="primary"
              disabled={profile.stars < next.cost}
              onClick={() => {
                setProfile(p => (p.stars < next.cost ? p : { ...p, stars: p.stars - next.cost, farm: p.farm + 1 }));
                // 망치질 소리 - 새 그림이 나타날 때 반짝 소리(FarmScene onBuilt)
                playSfx('dig');
                close();
              }}
            >
              열기 <small>⭐ {next.cost}</small>
            </button>
            {profile.stars < next.cost && <p className="pg-build-need">판을 깨면 별을 1개씩 받아요</p>}
          </div>
        </ModalShell>
      )}

      {modal && typeof modal === 'object' && 'plot' in modal && (() => {
        const crop = CROPS[modal.plot.crop];
        const planted = profile.plots[modal.plot.id];
        const remain = planted === undefined ? 0 : Math.max(0, planted + crop.growMs - Date.now());
        const cost = finishCost(remain);
        return (
          <ModalShell onClose={close}>
            <h2>{crop.name}</h2>
            <p className="pg-build-area">
              {remain > 0 ? `다 익기까지 ${formatCountdown(remain)}` : '다 익었어요!'} · 수확하면 코인 {crop.reward}
            </p>
            <img className="pg-crop-img" src={crop.icon} alt="" />
            <div className="jk-modal-actions">
              <button
                className="primary"
                disabled={remain <= 0 || profile.coins < cost}
                onClick={() => {
                  // 심은 시각을 그만큼 앞당겨 바로 다 익게 한다
                  setProfile(q => (q.coins < cost ? q : { ...q, coins: q.coins - cost, plots: { ...q.plots, [modal.plot.id]: Date.now() - crop.growMs } }));
                  playSfx('chime');
                  close();
                }}
              >
                바로 익히기 <small>🪙 {cost}</small>
              </button>
              <button onClick={close}>기다릴게요</button>
            </div>
          </ModalShell>
        );
      })()}

      {modal && typeof modal === 'object' && 'soon' in modal && (
        <ModalShell onClose={close}>
          <h2>{modal.soon}</h2>
          <p>준비 중이에요. 곧 만나요!</p>
          <div className="jk-modal-actions">
            <button className="primary" onClick={close}>
              확인
            </button>
          </div>
        </ModalShell>
      )}
    </ScaledStage>
  );
};

export default Lobby;

const EventIcon: React.FC<{
  label: string;
  /** 원판 안쪽 색 - 이벤트마다 달리 해서 한눈에 구분되게 */
  tone: 'green' | 'teal' | 'red' | 'blue' | 'purple';
  /** 지금 눌러야 할 것(받을 보상) - 이름표를 빨갛게 튀게 */
  hot?: boolean;
  dot?: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, tone, hot, dot, count, onClick, children }) => (
  <button className={`pg-event tone-${tone}${hot ? ' hot' : ''}`} onClick={onClick}>
    <span className="pg-event-ico">{children}</span>
    {dot && <i className="pg-dot" />}
    {count !== undefined && <i className="pg-count green">{count}</i>}
    <span className="pg-event-label">{label}</span>
  </button>
);

const NavButton: React.FC<{
  tab: Tab;
  cur: Tab;
  set: (t: Tab) => void;
  label: string;
  children: React.ReactNode;
}> = ({ tab, cur, set, label, children }) => (
  <button className={`pg-navbtn${cur === tab ? ' active' : ''}`} onClick={() => set(tab)}>
    {children}
    {cur === tab && <span>{label}</span>}
  </button>
);

export const ModalShell: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="jk-modal-back" onClick={onClose}>
    <div className="jk-modal" onClick={e => e.stopPropagation()}>
      <button className="jk-modal-close" onClick={onClose} aria-label="닫기">
        <X size={20} strokeWidth={3.5} />
      </button>
      {children}
    </div>
  </div>
);
