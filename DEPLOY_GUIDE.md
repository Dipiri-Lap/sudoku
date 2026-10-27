# 스도쿠 프로젝트 배포 가이드 🚀

본 가이드는 Vite + React 프로젝트를 가장 쉽고 빠르게 배포하는 방법을 설명합니다.

## 추천 플랫폼: Vercel (강력 추천)

Vercel은 Vite 프로젝트와 완벽하게 호환되며, 설정이 거의 필요 없는 무료 배포 플랫폼입니다.

### 1단계: 프로젝트 빌드 테스트
터미널에서 다음 명령어를 실행하여 빌드가 정상적으로 완료되는지 확인합니다:
```bash
npm run build
```
*(성공 시 `dist` 폴더가 생성됩니다. 제가 이미 확인을 마쳤습니다!)*

### 2단계: GitHub에 소스 코드 올리기
1. [GitHub](https://github.com)에서 새로운 저장소(Repository)를 만듭니다.
2. 로컬 터미널에서 코드를 푸시합니다:
```bash
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin [저장소 주소]
git push -u origin main
```

### 3단계: Vercel 연결
1. [Vercel](https://vercel.com)에 가입하고 'Add New Project'를 클릭합니다.
2. 위에서 만든 GitHub 저장소를 선택합니다.
3. 빌드 설정은 기본값 그대로 둡니다:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 'Deploy' 버튼을 누르면 끝!

## 주의 사항: SPA 라우팅
현재 URL 기반으로 페이지를 나누었기 때문에, 배포 후 `/sudoku`에서 새로고침 시 404 에러가 발생할 수 있습니다. 
이를 방지하기 위해 제가 이미 `vercel.json`과 `public/_redirects` 파일을 추가해 두었습니다. 설정 변경 없이 바로 배포하시면 정상 작동합니다.

## 결과물 확인
배포가 완료되면 사용자만의 고유한 `*.vercel.app` 주소가 생성됩니다. 이 주소를 도메인과 연결하여 정식 서비스로 확장하실 수 있습니다!

## 오늘의 퍼즐 푸시 알림 배포 순서

1. Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징 > 웹 푸시 인증서에서 키 쌍을 생성한다.

2. 공개 키를 `.env.local` 과 Vercel 환경 변수에 `VITE_FIREBASE_VAPID_KEY` 로 넣고 다시 배포한다.

3. `firebase deploy --only functions:dailyPuzzlePushMorning,functions:dailyPuzzlePushEvening` 로 예약 발송 함수를 올린다. (Cloud Scheduler 사용을 위해 Blaze 요금제가 필요하다.)

4. 오늘의 퍼즐을 클리어한 뒤 "알림 받기"를 눌러 토큰이 `users/{uid}/pushTokens` 에 저장되는지 확인한다.

5. 콘솔의 Cloud Scheduler 에서 두 작업을 "강제 실행"해 알림이 오는지 확인한다.
