# Wissly usability study

한국어·영어 과제 안내, 작업 자료, 설문 자동 저장, 재접속 코드, 진행자 응답 조회를 제공하는 독립 연구 사이트입니다. 참여자에게 ChatGPT·GitHub·Cloudflare 계정을 요구하지 않습니다.

## 실행

Node.js 24.13 이상(24.x)에서 `npm start`를 실행하고 `http://localhost:4173`을 엽니다. 추가 패키지를 설치할 필요가 없습니다. 다른 PC에 공개하는 서버가 아닌 이 PC의 미리보기입니다.

- 참여자: `/` 또는 `/en/index.html?lang=en`
- 진행자: `/admin.html`
- 로컬 진행자 키: 첫 실행 시 생성되는 `.data/admin-key.txt`
- 공개 사이트 진행자 키: `.data/production-admin-key.txt` (Cloudflare의 `ADMIN_KEY`와 동일, Git 추적 제외)
- 로컬 응답: `.data/study.sqlite` (Git 추적 제외)
- 검사: `npm run check`, `npm test`
- 로컬 SQLite 백업: `npm run backup`

## 참여 흐름

처음에는 ‘시작하기’를 누릅니다. 작업 자료와 위슬리를 준비한 뒤 사전 설문, 4개 과제(발표자료는 초안·수정 2단계), 사후 설문, 구두 인터뷰 순서로 진행합니다. 응답과 진행자 메모는 자동 저장됩니다. 최종 제출로 잠그는 단계는 없으며 인터뷰 후에도 수정할 수 있습니다.

준비 화면 또는 ‘응답 기록’에서 재접속 코드를 내려받습니다. 다른 기기에서 이 코드를 입력하면 같은 기록을 엽니다. 코드는 응답 접근 권한이므로 타인에게 공개하지 않습니다. 공용 PC에서는 ‘이 기기에서 나가기’를 누릅니다. ‘새 참여자 시작’은 이전 참여자의 접근 정보를 지우고 별도 코드를 발급합니다. 짧은 P01 표시는 연구용 식별자이며 재접속 코드가 아닙니다.

진행자는 별도 키로 `/admin.html`을 엽니다. 전체 현재 응답 CSV, 응답·수정 이력 JSON, 개별 기록을 내려받을 수 있습니다. 키는 서버 환경에만 설정하며 저장소나 사이트 코드에 넣지 않습니다. 진행자 세션은 12시간 뒤 만료됩니다.

저장되는 것은 설문 응답, 진행 단계, 수정 이력과 저장 시각, 인터뷰 시작 시점, 입력한 메모입니다. 위슬리 안의 클릭·프롬프트·재시도 횟수·음성·화면·생성 파일 내용은 자동 수집하지 않습니다. 기록 수와 저장 횟수는 시도 횟수가 아닙니다. 인터뷰 시작 전 설문은 당시 수정 이력에서 별도로 보존합니다.

## 무료 공개 배포

GitHub Pages는 공개 화면과 작업 자료를 제공하고, Cloudflare Workers + D1은 응답을 저장합니다. `public/`만 Pages의 `gh-pages` 브랜치에 배포합니다. 관리자 키·참여자 응답·로컬 QA 자료는 올리지 않습니다. 참여자는 가입 없이 이용합니다. 운영자만 두 서비스의 계정이 필요합니다.

1. Cloudflare 무료 계정에서 로그인합니다: `npx wrangler@4 login`.
2. `npx wrangler@4 d1 create wissly-study`로 새 데이터베이스를 만들고 반환된 ID를 `wrangler.jsonc`의 `database_id`에 넣습니다. 기존 데이터베이스가 있으면 먼저 확인하고 재사용합니다.
3. 최초 DB에만 `npx wrangler@4 d1 execute wissly-study --remote --file server/schema.sql`을 실행합니다. 그다음 `npx wrangler@4 d1 execute wissly-study --remote --file server/access-schema.sql`을 실행합니다. 첫 명령을 기존 데이터가 있는 DB에 반복하지 않습니다.
4. `npx wrangler@4 secret put ADMIN_KEY`를 실행해 무작위 32자 이상의 진행자 키를 입력합니다. 참가자에게 전달하지 않습니다. 토큰은 저장소·명령 인수·브라우저 소스에 넣지 않습니다.
5. `npx wrangler@4 deploy`로 API를 배포합니다. `ALLOWED_ORIGINS`는 Pages origin (`https://rgh112.github.io`)과 현재 GitHub 계정의 기존 도메인 (`https://kunheeryu.com`)을 허용합니다. 별도 주소를 쓰면 이 값을 변경합니다.
6. `node scripts/configure-api.mjs https://실제-API주소.workers.dev`로 프런트엔드를 연결합니다. 현재 운영 API는 `https://wissly-study-api.wissly-study-web.workers.dev`입니다. API URL은 비밀키가 아니며 공개해도 됩니다.
7. 변경을 커밋한 뒤 `powershell -File scripts/publish-pages.ps1`을 실행합니다. GitHub 저장소 Settings → Pages에서 `gh-pages`, `/ (root)`를 선택합니다.
8. 공개 사이트에서 한국어·영어 참여, 응답 저장·재접속·수정, 관리자 조회·내려받기를 확인한 뒤 실제 연구에 사용합니다. API 미연결 상태에서는 Pages의 시작 버튼을 비활성화합니다.

참여자는 기본 50명까지 새 코드를 만들 수 있습니다. 실제 연구 약 10명과 사전 점검을 위한 여유이며 `MAX_PARTICIPANTS`로 변경합니다. 같은 코드의 별도 기록은 10개까지입니다. 사이트 공개와 응답 접근 권한은 분리되어 있습니다. 기존 ChatGPT Sites의 응답은 자동 이전하지 않았습니다.

무료 한도는 서비스 정책에 따라 달라집니다. 확인 자료(2026-11-02): [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/), [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/). 현행 D1 Free는 읽기 500만 행/일, 쓰기 10만 행/일, 총 저장 5GB를 포함합니다. 무료 플랜 유지 상태에서 배포하며 유료 업그레이드는 별도로 결정합니다.

## 운영과 백업

실험 전후 진행자 화면에서 전체 JSON과 CSV를 내려받아 연구용 저장 위치에 보관합니다. Cloudflare 운영 DB는 `npx wrangler@4 d1 export wissly-study --remote --output .data/cloudflare-backup.sql`로 별도 백업할 수 있습니다. 이 파일을 공개 저장소에 올리지 않습니다.

`npm start`의 로컬 DB와 Cloudflare D1은 서로 다른 저장소입니다. 같은 참여 코드라도 다른 서버에서 자동 통합되지 않습니다. Cloudflare 전환 후에는 공개 URL로 실제 참여를 진행합니다.

원래 질문·과제·자료는 `study-guide-site`의 v5 구성에서 가져왔습니다. 기존 Sites 프로젝트는 변경하지 않았습니다. 영어 선택지의 내부 코드는 한국어와 동일하게 유지합니다.

## 현재 공개 위치

- 저장소: https://github.com/rgh112/wissly-study-web
- 사이트: https://kunheeryu.com/wissly-study-web/
- 영문: https://kunheeryu.com/wissly-study-web/en/index.html?lang=en
- 진행자: https://kunheeryu.com/wissly-study-web/admin.html

GitHub 계정의 기존 사용자 사이트 도메인을 자동으로 상속합니다. 기존 개인 홈페이지와 DNS 설정은 변경하지 않았습니다. Cloudflare D1 운영 저장소 연결을 완료했습니다. 참여자는 로그인 없이 시작하고 재접속 코드로 응답을 다시 엽니다.

운영 DB는 `wissly-study`입니다. 로컬 점검은 `.data/study.sqlite`를 사용하며, 공개 API 주소가 설정되어 있어도 `npm start`는 로컬 DB만 사용하도록 분리했습니다. Cloudflare에서 수행하는 자동화 검증은 별도 QA 저장소를 사용합니다. 실제 연구용 DB에 테스트 참여자를 생성하지 않습니다.
