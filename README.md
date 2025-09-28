This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# PropertyManager

부동산 매물 관리 용도의 간단한 web-app

# Data Model

## Property

| key    | type                | desc                              |
| ------ | ------------------- | --------------------------------- |
| id     | Integer             | 매물을 unique 하게 구분하는 ID    |
| fields | List<PropertyField> | 동적 정의된 필드들의 실제 값 목록 |

## Field

| key          | type    | desc                                        |
| ------------ | ------- | ------------------------------------------- |
| id           | Integer | 필드 ID                                     |
| name         | String  | UI 표시 이름                                |
| type         | Enum    | text/number/boolean/date/url/image/location |
| defaultValue | String  | 기본값 (비어있을 때 사용)                   |
| isRequired   | Boolean | 필수 여부                                   |
| order        | Number? | 정렬 순서 (오름차순)                        |

### 필드 예시 목록

주택명, 주소, 링크, 가격, 입주 가능 연월, 입주 시점 협의 가능, 전용 면적, 인접 셔틀버스 승차장, 거리, 층, EV, 주차 대수, 세대 수, 준공연월, 전세가, 전세가 기준일, KB부동산가격, 관리비, 방 개수, 화장실 개수, 승민 한 줄 평, 공인중개사명, 연락처, 매물번호, 사진, Location, 인접 셔틀버스 승차장 (location) 등

# 주요 기능

## Property Cards Grid View

-   핵심 필드 위주 카드형 표시 (추후 구현 확장 가능)

## Property DataTable (Full Screen)

-   모든 필드를 컬럼으로 표시 + 드래그 & 드롭 컬럼 순서 변경 + 인라인 편집 + 필드 추가/수정/삭제
-   Buttons:
    -   Add Property: 새 매물 생성 모달
    -   Add Field: 새 필드 정의 추가
    -   Exit Full Screen: 사이드바 뷰로 복귀

## LOCATION / 지도 보기

Naver Maps API 를 이용하여 좌표 선택 및 표시.

### Naver Maps API 설정

1. Naver Cloud Platform 에서 지도 Client ID 발급
2. 루트 `.env.local` 파일 생성 후:

```
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=YOUR_CLIENT_ID
```

3. 개발 서버 재시작

### LOCATION 필드 저장 형식

`"x,y"` 형태 (x=경도 lng, y=위도 lat). 지도에서 클릭 시 자동 입력.

# Add Property Modal (매물 추가 모달)

Full Screen 상단의 `Add Property` 클릭시 표시.

### 특징

-   필드 order 기준 정렬
-   필수 필드 누락 시:
    -   붉은 테두리 + 하단 경고문구 `필수 필드입니다. 입력해주세요`
    -   첫 번째 누락 필드 자동 포커스
-   타입별 입력 UX
    -   TEXT / IMAGE / URL: 텍스트 인풋
    -   NUMBER: 숫자 인풋 (간단 검증)
    -   BOOLEAN: 체크박스
    -   DATE: 날짜 인풋
    -   LOCATION: 읽기 전용 입력 + 좌표 선택 팝업 (Naver 지도)
-   URL/DATE/NUMBER/LOCATION 형식 검증

### 생성 흐름

1. 값 입력 → 2. 생성 클릭 → 3. `/api/properties` POST → 4. 성공 시 테이블 즉시 반영 & Toast

### 좌표 선택

`좌표 선택` 버튼 → 지도에서 클릭 → (x,y) 나타남 → 적용/닫기

### 커스터마이징

-   NUMBER 값을 실제 number로 강제 저장: `AddPropertyModal` 내부 `setValue` 수정
-   LOCATION 을 객체 `{x:number,y:number}`로 저장하려면 서버/타입 정의 변경 필요

# 화면 구성

## Main / Sidebar State

-   collapsed / expanded / full-screen 전환
-   full-screen 에서 DataTable 기능 사용

# 개발 & 실행

```bash
npm install
npm run dev
```

브라우저: http://localhost:3000

# 기타

Next.js App Router 기반. 데이터는 `src/data/*.json` 에 파일로 저장 (데모 용).
프로덕션 전환 시 DB 어댑터 구현 필요.

# 학습 자료

-   Next.js Docs
-   React / TypeScript

# 배포

Vercel 권장. 환경변수(Naver Client ID) 설정 잊지 말 것.
