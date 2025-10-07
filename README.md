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
    -   Filter Reset: 모든 컬럼 필터 초기화

### 컬럼 필터링 (Filtering)

테이블 헤더 아래 2번째 줄에 필터 UI 가 생성됩니다. 필드 타입에 따라 입력 형태가 다릅니다.

| 타입                                      | UI 형태                    | 동작                                                                               |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| ID (내부) / TEXT / URL / IMAGE / LOCATION | 단일 텍스트 인풋           | 부분 문자열(contains) 매칭 (대소문자 구분 없음)                                    |
| NUMBER                                    | min / max 두 개 인풋       | min 이상 AND max 이하 범위 필터 (빈 값은 무시)                                     |
| DATE                                      | from / to 두 개 date 인풋  | from 이상 AND to 이하 범위. 값이 `YYYY-MM` 인 경우 자동으로 `-01` 로 패딩하여 비교 |
| BOOLEAN                                   | 드롭다운 (전체/True/False) | 선택 값과 동일한 boolean 만 표시                                                   |

복수 컬럼 필터는 AND 조건으로 결합됩니다. 필터 초기화 버튼(필터 초기화)을 눌러 모든 필터를 제거할 수 있습니다.

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

### 인접 셔틀버스 승차장 (Shuttle Stops)

반복 입력의 불편함을 줄이기 위해 인접 셔틀버스 승차장은 별도의 마스터 데이터(`src/data/shuttleStops.json`)로 관리됩니다.

#### 데이터 구조 (ShuttleStop)

```ts
interface ShuttleStop {
    id: number;
    name: string; // 짧은 명칭 (역 이름 등)
    label: string; // 표시용 전체 라벨 (출구/기타 설명 포함)
    coords: { x: number; y: number }; // x=경도, y=위도
}
```

#### API

| Method | Path                 | 설명                       |
| ------ | -------------------- | -------------------------- |
| GET    | `/api/shuttle-stops` | 모든 셔틀 승차장 목록 조회 |
| POST   | `/api/shuttle-stops` | 새 셔틀 승차장 추가        |

POST Body 예시:

```json
{
    "name": "송파역",
    "label": "송파역 4번출구 셔틀 승차장",
    "coords": { "x": 127.1120031, "y": 37.4993436 }
}
```

#### Add Property Modal 연동

필드 이름이 `인접 셔틀버스 승차장` 이고 타입이 LOCATION 인 경우:

1. 모달이 열릴 때 `/api/shuttle-stops` 호출해 드롭다운에 목록 표시
2. 드롭다운에서 선택하면 해당 좌표(`x,y`)와 `label` 자동 세팅
3. 필요 시 `수동 좌표` 버튼을 눌러 기존과 동일한 좌표 선택 팝업 이용 가능
4. 드롭다운 선택 후에도 하단 라벨 인풋을 직접 수정하여 커스터마이징 가능

셔틀 목록 로딩 실패 시(네트워크 등) 기존 LOCATION 입력 UI 로 폴백됩니다.

### 셔틀 승차장 관리 UI

`/shuttle-stops` 경로에서 마스터 CRUD 화면을 제공합니다.

기능:

1. 목록 조회 / 새로고침
2. 검색 (이름 및 라벨 부분 일치)
3. 신규 추가 (name, label, coords)
4. 행 단위 수정 (이름, 라벨, 좌표) 후 저장 / 취소
5. 삭제 (확인 대화 상자)
6. 지도 기반 좌표 선택 (신규/수정 시 '지도에서 선택' 또는 '지도' 버튼)

지도 선택 모달은 기존 `LocationPicker`를 재사용하며 클릭 시 경도(x)/위도(y)가 즉시 반영됩니다.

### 자동 거리 계산

`AddPropertyModal`에서 다음 두 LOCATION 필드 값이 모두 존재할 때:

-   `Location` (매물 좌표)
-   `인접 셔틀버스 승차장` (선택 또는 수동 설정된 셔틀 좌표)

Haversine 공식을 이용해 두 지점 간 직선거리(km)를 계산하고 `거리` 필드에 소수 둘째 자리까지 자동 입력합니다. 사용자는 필요 시 직접 값을 수정할 수 있습니다 (현재는 자동 계산이 다시 강제 덮어쓰지 않도록 동일 값일 때만 갱신 조건 검사 포함).

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

## Naver Maps 인증 문제 해결 (Troubleshooting)

증상:

-   콘솔에 `MAP_AUTHENTICATION_ERROR`, `RefererNotAllowed`, `api authentication failed`
-   화면에 "네이버 지도 스크립트 로드 실패 (키 혹은 도메인 인증 문제 가능)"

체크리스트:

1. `.env.local` 에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 존재 여부
2. 올바른 Client ID 인지 (Secret 필요 없음)
3. Naver Cloud > Application > Maps 서비스 활성화
4. 도메인 / 서브도메인 referer 등록 (예: `http://localhost:3000`, 프로덕션 도메인 전체)
5. 로컬 http/https 둘 다 필요 시 모두 등록
6. 일일 사용량/쿼터 초과 여부
7. 캐시 문제 시 브라우저 강력 새로고침

빠른 키 응답 확인 (Windows PowerShell 예):

```powershell
Invoke-WebRequest "https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=$env:NEXT_PUBLIC_NAVER_MAP_CLIENT_ID" -Method Head | Select-Object StatusCode
```

200 이 아니면 Key / 권한 / Referer 설정 재점검.
