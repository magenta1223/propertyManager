This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# PropertyManager

부동산 매물 관리 용도의 간단한 web-app

# DataModel

## Property

property 객체의 field는 다음과 같다.

-   id:
    -   type: Integer
    -   desc: property를 unique하게 구분할 수 있는 key
-   fields
    -   type: List<Field>
    -   desc: propery가 갖고있는 fields

## RawProperty

fields를 DB에 저장하기 어려우므로 DB와 호환 가능한 형태로 변환함.

-   id:
    -   type: Integer
    -   desc: property를 unique하게 구분할 수 있는 key. Property의 Key와 동일함
-   fields
    -   type: String
    -   desc: property.fields를 문자열로 변환한 형태.

## Field

Property 객체의 fields의 요소가 됨.

-   id
    -   type: Integer
    -   desc: field를 unique하게 구분하는 key
-   name
    -   type: String
    -   desc: field가 표시되는 이름
-   type: field의 type
    -   type: String or enum
    -   desc: field의 type
-   defaultValue:
    -   type: String
    -   desc: 이 field가 비어있을 경우 default 값
-   isRequired:
    -   type: Boolean
    -   desc: 필수 입력 여부 표시.

### 현재 Field 목록

-   주택명
-   주소
-   링크
-   가격 (억 원)
-   입주 가능 연월
-   입주연월협의가능
-   전용 면적
-   셔틀 버스 인접 역
-   거리
-   층
-   EV
-   주차
-   세대
-   준공연월
-   전세가
-   전세가 기준일
-   KB부동산 가격
-   관리비
-   방
-   화장실
-   주실
-   방향
-   승민한줄평
-   공인중개사명
-   연락처
-   매물번호
-   사진

# Key Feature

## Property Cards Grid view

-   description: Property의 중요한 field만을 보여주는 Card Grid view
-   onClick: 모든 feature를 보여주는 Detail Card로 이동
-   buttons:
    -   새로 만들기: 아래의 새로 만들기 form을 띄움.

## Property DataTable

Property의 모든 field를 table 형태로 보여줌.

-   onClickItem: click한 Item의 모든 feature를 보여주는 Detail Card
-   buttons:
    -   새로 만들기: 새로 만들기 form을 띄움
    -   field 추가: property에 새로운 field를 추가할 수 있음

## 지도 보기

naver maps api를 이용, 현재 저장된 properties의 x, y 좌표를 참조해 지도 상에 띄운다.

# 화면 구성

## Main

-   sideBar: navigationRail. click 시 Property Cards Grid view 가 나옴. filter 가능
-   main: filter에 맞는 property를 "지도보기"를 통해보여줌

### Side Bar

-   navigationRail 형태
-   state
    -   collapesed: 좌측에 얇게 보이는 상태. default state
        -   onClick: expanded로 전환
    -   expanded: 화면 좌측 일부를 점유하는 형태. 일반적인 side bar의 동작을 따름
        -   onClick: collapsed로 전환
        -   button:
            -   우측 상단에 클릭 시 fullScreen으로 전환하는 버튼 추가.
    -   full-screen: 화면 전체를 점유하는 형태

## Property

-   Property의 일부 중요한 정보만을 보여주

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
