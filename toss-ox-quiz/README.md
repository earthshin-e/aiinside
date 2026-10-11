# 공인중개사 OX 퀴즈 (토스 미니앱)

외부 패키지 없는 정적 웹앱입니다. 앱인토스(Apps in Toss) WebView 미니앱으로 올릴 수 있습니다.

## 구성
index.html 화면과 로직
questions.js 문제 데이터 26개 (6과목)

## 문제 출처 원칙
기출 문제는 쓰지 않고, 공개된 법령 조문(저작권법 제7조에 따라 보호 대상 아님)과 기본 이론으로 직접 작성했습니다. 해설에 근거 조문을 적었습니다.

## 로컬 실행
npx serve . 또는 python3 -m http.server 후 브라우저로 열기

## 토스 미니앱 등록
1. 앱인토스 콘솔(apps-in-toss.toss.im)에서 앱 생성
2. WebView 방식으로 @apps-in-toss/web-framework 를 붙여 빌드
3. 샌드박스 앱으로 테스트 후 검수 요청
