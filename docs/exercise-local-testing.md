# Exercise 로컬 테스트 가이드

## 1. 테스트 범위와 운영 서비스 분리

운동 기능은 웹 빌드의 `/exercise/*` 경로에서 독립적으로 실행됩니다.

처음 실행하는 PC에서는 프로젝트 폴더에서 의존성을 설치합니다.

```powershell
cd C:\Users\DSU\Desktop\health-care-app
npm install
```

- 운동 홈: `/exercise/home`
- 사용자 선택: `/exercise/users`
- 사용자 등록: `/exercise/register`
- 운동 선택: `/exercise/select`
- 운동 세션: `/exercise/session`
- 결과: `/exercise/result`

로컬 테스트에서는 반드시 위 경로 중 하나로 직접 접속합니다. 루트 경로
`/`는 기존 헬스케어 앱을 렌더링하며 운영 웹 서비스
`https://routine-care.insystem.kr`를 열 수 있습니다. 운동 기능을 확인할 때는
운영 로그인 화면을 거치거나 운영 계정을 사용할 필요가 없습니다.

브라우저 개발자 도구의 Network 탭에서도
`routine-care.insystem.kr`와 `routine-care-api.insystem.kr` 요청이 없는지
확인합니다. MediaPipe 모델은 jsDelivr CDN에서 내려받으므로 인터넷 연결은
필요합니다.

## 2. 로컬 기록 저장 모드

처음 한 번 다음과 같이 로컬 환경 파일을 만듭니다.

```powershell
Copy-Item .env.example .env.local
```

`.env.local`에서 `VITE_EXERCISE_RECORD_API_URL`을 비워 두면 운동 결과는
현재 브라우저의 `localStorage`에만 저장되고 기록 API 요청은 전송되지
않습니다.

```dotenv
VITE_EXERCISE_RECORD_API_URL=
```

로컬 또는 테스트 API에 실제로 저장해야 할 때만 POST 대상 URL을 지정합니다.

```dotenv
VITE_EXERCISE_RECORD_API_URL=http://127.0.0.1:8000/record
```

환경변수를 변경한 뒤에는 Vite 서버를 다시 시작해야 합니다. iPhone에서
`127.0.0.1`은 개발 PC가 아니라 iPhone 자신을 뜻합니다. iPhone 테스트에서
API를 사용하려면 iPhone이 접근할 수 있는 PC의 LAN 주소 또는 HTTPS 테스트
주소를 사용해야 합니다. HTTPS 페이지에서 HTTP API를 호출하면 mixed-content
정책으로 차단되므로 두 주소의 보안 수준도 맞춰야 합니다.

## 3. Jest 순수 로직 테스트

```powershell
npm run test:exercise
```

이 명령은 다음 로직을 브라우저나 카메라 없이 검사합니다.

- 전신 랜드마크와 화면 잘림 판정
- 전신 인식 안정화와 인식 손실 히스테리시스
- 머리부터 발끝까지의 높이를 기준으로 한 정렬
- 팔을 벌렸을 때 배율이 흔들리지 않는지 여부
- 고정된 시범 영상에 웹캠 레이어만 정렬되는지 여부
- 장시간 정렬 수렴과 인식 손실 복구
- 대기, 카운트다운, 재생, 일시정지, 분석 상태 전환
- 재시작 전에 만들어진 오래된 타이머의 무효화

전체 프로젝트 테스트는 별도로 실행합니다.

```powershell
npm test -- --runInBand
```

MediaPipe, Canvas, 실제 비디오 디코딩과 카메라 권한은 Jest가 아니라 아래
브라우저 테스트에서 확인합니다.

## 4. PC 웹 테스트

### 샘플 영상을 웹캠 대신 사용

```powershell
npm run web:local
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3000/exercise/session?mockCamera=1
```

`mockCamera=1`은 개발 모드에서만 테스트 영상을 카메라 입력으로 사용합니다.
정렬 보정을 확인할 때는 다음 파라미터도 사용할 수 있습니다.

```text
http://localhost:3000/exercise/session?mockCamera=1&mockCameraZoom=1.5
http://localhost:3000/exercise/session?mockCamera=1&mockCameraX=160
http://localhost:3000/exercise/session?mockCamera=1&mockCameraY=80
```

다음을 확인합니다.

1. 제품 화면에 디버그 패널이나 정렬 가이드가 나타나지 않는다.
2. 사용자 영상과 반투명 시범 영상이 같은 화면에 표시된다.
3. 머리부터 발끝까지 안정적으로 인식되기 전에는 카운트다운이 시작되지 않는다.
4. 시범 영상은 고정되어 있고 사용자 웹캠 레이어만 크기와 위치가 바뀐다.
5. 일시 정지, 처음부터, 결과 보기 버튼이 동작한다.
6. 결과 저장 후 새로고침해도 로컬 결과가 유지된다.
7. Network 탭에 운영 서비스로 향하는 요청이 없다.

### PC의 실제 웹캠 사용

`mockCamera` 파라미터 없이 운동을 선택하거나 다음 주소를 엽니다.

```text
http://localhost:3000/exercise/session
```

`localhost`는 브라우저의 secure-context 예외이므로 Chrome과 Edge에서 실제
카메라를 사용할 수 있습니다. 카메라 권한을 허용하고, 머리와 양발이 화면
안에 들어오도록 충분히 뒤로 섭니다.

모바일 반응형은 브라우저 개발자 도구에서 최소한 다음 크기로 확인합니다.

- iPhone SE: 375 × 667
- 일반 iPhone: 390 × 844
- 가로 화면: 844 × 390

가로 스크롤, 잘린 버튼, 상태 문구가 영상을 과도하게 가리는 현상이 없어야
합니다.

## 5. iPhone Safari 테스트

PC와 iPhone을 같은 네트워크에 연결하고 Windows 방화벽에서 Vite의 3000번
포트 접근을 허용합니다. `npm run web:local` 실행 후 PC의 LAN IP를 사용합니다.

```text
http://<PC-LAN-IP>:3000/exercise/session?mockCamera=1
```

일반 HTTP LAN 주소에서는 mock 영상으로 UI와 동작을 확인할 수 있지만 실제
카메라의 `getUserMedia`는 secure context가 아니므로 사용할 수 없습니다.
실제 iPhone 카메라를 시험하려면 다음 중 하나가 필요합니다.

- 로컬 Vite 서버를 신뢰 가능한 HTTPS 터널로 노출
- LAN IP가 포함된 개발 인증서를 만들고 인증기관을 iPhone에 설치한 뒤 신뢰
- 별도의 HTTPS 개발 환경에 빌드를 배포

HTTPS 주소에서 `mockCamera`를 제거하고 Safari의 사이트별 카메라 권한을
허용합니다. 테스트 중에는 다음도 확인합니다.

- 전면 카메라가 선택된다.
- 비디오가 전체 화면 플레이어로 전환되지 않고 페이지 안에서 재생된다.
- 화면 회전 후 Canvas와 터치 버튼 배치가 정상이다.
- 브라우저 주소창이 접히거나 펼쳐져도 하단 버튼에 접근할 수 있다.
- 장시간 실행 시 프레임 저하, 발열 또는 페이지 새로고침이 발생하지 않는다.

## 6. 네이티브 iOS 앱과의 차이

현재 운동 기능은 React Native의 네이티브 화면으로 연결된 것이 아니라
`App.web.tsx`의 웹 전용 `/exercise/*` 경로에 있습니다. 네이티브
`ExerciseEntry.tsx`는 운동 화면을 렌더링하지 않으며 기존 iOS 앱은 운영
서비스 WebView를 엽니다.

따라서 위 iPhone 절차는 Safari 모바일 웹 테스트입니다. Xcode Simulator나
실기기 앱 내부 WKWebView 테스트는 운동 전용 WebView 화면, 개발 URL 분기,
`NSCameraUsageDescription`과 WebView 미디어 캡처 권한을 추가한 뒤 별도로
진행해야 합니다. iOS Simulator에서는 실제 카메라 대신 `mockCamera`를
사용합니다. 네이티브 앱 빌드는 macOS와 Xcode가 필요합니다.

## 7. 운동 동영상 변경

제품의 운동 목록은 `src/exercise/exercises.js`에서 관리합니다.
새 운동을 추가하거나 기존 영상을 바꿀 때 해당 설정의 `image`와 `video`
파일명을 변경합니다.

```js
{
  id: 'breathing',
  title: '숨쉬기 운동',
  description: '숨쉬기 운동으로 호흡을 가다듬으세요.',
  image: 'M_Breath_front.png',
  video: 'M_Breath_front.mp4',
}
```

파일 위치는 다음과 같습니다.

- 썸네일: `public/exercise/images/<image>`
- 제품 시범 영상: `public/exercise/videos/reference/<video>`
- 개발용 mock 카메라 영상:
  `public/exercise/videos/TestExercise.mp4`

파일명은 설정과 대소문자까지 정확히 일치해야 합니다. 특히 배포 서버는
Windows와 달리 대소문자를 구분할 수 있습니다. iPhone Safari 호환성을 위해
시범 영상은 H.264 비디오가 들어 있는 MP4 컨테이너로 인코딩하고 웹 재생을
위한 fast-start 메타데이터를 적용하는 것을 권장합니다.
