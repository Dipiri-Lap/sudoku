import React, { useCallback, useEffect, useState } from 'react';
import JewelKingdomGame, { STAGE_COUNT, stageIndexOf } from '../ui/JewelKingdomGame';
import { startBgm, unlockAudio } from '../ui/sound';
import TitleScreen from './TitleScreen';
import Lobby from './Lobby';
import {
  CONTINUE_COST,
  CONTINUE_MOVES,
  SEASON_GOAL,
  SEASON_PER_WIN,
  WIN_COINS,
  loadProfile,
  loseLife,
  refillLives,
  saveProfile,
  type Profile,
} from './profile';
import '../ui/JewelKingdomGame.css';
import './PopGarden.css';

/**
 * Pop Garden: 타이틀 → 로비 → 플레이.
 *
 * 화면 셋을 한 컴포넌트가 바꿔 끼운다(주소는 /jewel-kingdom 하나). 플레이어 기록(레벨·코인·하트)은
 * 여기서만 바꾸고 기기에 저장한다 - 화면들은 받은 값을 보여 주고 바꾸고 싶을 때 여기에 알린다.
 */
type Screen = 'title' | 'lobby' | 'play';

const PopGardenApp: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('title');
  const [profile, setProfileState] = useState<Profile>(loadProfile);
  /** 같은 레벨을 다시 띄울 때 게임 화면을 새로 만들기 위한 번호 */
  const [playKey, setPlayKey] = useState(0);

  const setProfile = useCallback((f: (p: Profile) => Profile) => {
    setProfileState(p => {
      const next = f(p);
      saveProfile(next);
      return next;
    });
  }, []);

  // 앱 공통 틀(#root 최대 500px)을 이 게임에서만 푼다
  useEffect(() => {
    document.body.classList.add('jk-body');
    document.title = 'Pop Garden';
    return () => document.body.classList.remove('jk-body');
  }, []);

  // 하트 충전: 1초마다 지난 시간만큼 채운다(로비 타이머도 이걸로 움직인다)
  useEffect(() => {
    const id = window.setInterval(() => {
      setProfileState(p => {
        const next = refillLives(p, Date.now());
        if (next !== p) saveProfile(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // 타이틀·로비는 로비 곡. 플레이 곡은 게임 화면이 스스로 튼다
  useEffect(() => {
    if (screen !== 'play') startBgm('lobby');
  }, [screen]);

  const stage = Math.min(profile.stage, STAGE_COUNT);

  const startPlay = () => {
    if (profile.lives <= 0) return false;
    setPlayKey(k => k + 1);
    setScreen('play');
    return true;
  };

  if (screen === 'title') {
    return (
      <TitleScreen
        onStart={() => {
          unlockAudio();
          setScreen('lobby');
        }}
      />
    );
  }

  if (screen === 'lobby') {
    return <Lobby profile={profile} setProfile={setProfile} stage={stage} onPlay={startPlay} />;
  }

  return (
    <JewelKingdomGame
      key={playKey}
      startIndex={stageIndexOf(stage)}
      winCoins={WIN_COINS}
      onWin={() => {
        setProfile(p => ({
          ...p,
          stage: Math.min(p.stage + 1, STAGE_COUNT),
          coins: p.coins + WIN_COINS,
          season: Math.min(SEASON_GOAL, p.season + SEASON_PER_WIN),
          stars: p.stars + 1,
        }));
        setScreen('lobby');
      }}
      onLose={() => {
        setProfile(p => loseLife(p, Date.now()));
        setScreen('lobby');
      }}
      onQuit={() => {
        setProfile(p => loseLife(p, Date.now()));
        setScreen('lobby');
      }}
      onRetry={() => {
        // 지거나 포기한 판의 하트를 쓰고, 남은 하트가 있어야 다시 할 수 있다
        const after = loseLife(profile, Date.now());
        setProfile(() => after);
        if (after.lives <= 0) {
          setScreen('lobby');
          return false;
        }
        return true;
      }}
      buyMovesCost={CONTINUE_COST}
      buyMovesCount={CONTINUE_MOVES}
      onBuyMoves={() => {
        if (profile.coins < CONTINUE_COST) return false;
        setProfile(p => ({ ...p, coins: p.coins - CONTINUE_COST }));
        return true;
      }}
    />
  );
};

export default PopGardenApp;
