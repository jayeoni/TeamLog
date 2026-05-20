# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `teamlog-app`)
4. Google Analytics는 선택 사항

## 2. Authentication 설정
1. 좌측 메뉴 → Build → Authentication
2. "시작하기" 클릭
3. Sign-in method 탭 → "이메일/비밀번호" 활성화

## 3. Firestore Database 설정
1. 좌측 메뉴 → Build → Firestore Database
2. "데이터베이스 만들기" 클릭
3. 리전: `asia-northeast3 (Seoul)` 선택 권장
4. 보안 규칙: "프로덕션 모드"로 시작

## 4. 보안 규칙 적용
Firestore → 규칙 탭에서 `firestore.rules` 파일 내용을 붙여넣기 후 게시

## 5. 웹 앱 등록 및 환경변수 설정
1. 프로젝트 설정(톱니바퀴) → 일반 탭
2. "앱 추가" → 웹(</>)
3. 앱 닉네임 입력 후 등록
4. firebaseConfig 값을 복사

### .env 파일 생성
프로젝트 루트에 `.env` 파일을 생성하고 아래 내용 입력:

```
VITE_FIREBASE_API_KEY=복사한_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 6. Firestore 인덱스 설정
복합 쿼리 사용을 위해 아래 인덱스를 Firestore → 인덱스 탭에서 추가:

| 컬렉션 | 필드 1 | 필드 2 | 쿼리 범위 |
|--------|--------|--------|-----------|
| dailyLogs | athleteId (ASC) | date (DESC) | 컬렉션 |
| dailyLogs | teamId (ASC) | date (ASC) | 컬렉션 |
| users | teamId (ASC) | role (ASC) | 컬렉션 |

앱 실행 시 콘솔에 인덱스 생성 링크가 표시되면 클릭해서 생성할 수도 있습니다.

## 7. 개발 서버 시작
```bash
npm run dev
```

## Capacitor (모바일 앱 래핑)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init TeamLog com.yourname.teamlog
npm run build
npx cap add ios
npx cap add android
npx cap sync
```
