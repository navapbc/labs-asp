# [1.9.0](https://github.com/navapbc/labs-asp/compare/v1.8.1...v1.9.0) (2026-03-25)


### Bug Fixes

* added in cancel button on full screen mode ([5c504be](https://github.com/navapbc/labs-asp/commit/5c504be1cbffda12672d9fafeef4ff86bf6e0186))
* remove header for chat ([98f42ba](https://github.com/navapbc/labs-asp/commit/98f42bad68d4c349aa2242e5802dcef78357738a))
* update client submodule with prompt edits ([786380f](https://github.com/navapbc/labs-asp/commit/786380f46334cc21f3b98504659100f2c2ac19de))


### Features

* model selector for dev ([b5ac78a](https://github.com/navapbc/labs-asp/commit/b5ac78a530bccce4d815096944266151e3031878))
* tests for tablet ([c348124](https://github.com/navapbc/labs-asp/commit/c348124dd70a9e2865b7fb01027da713b0b7a963))

## [1.8.1](https://github.com/navapbc/labs-asp/compare/v1.8.0...v1.8.1) (2026-03-18)


### Bug Fixes

* updates to the communication skill ([cfe33f8](https://github.com/navapbc/labs-asp/commit/cfe33f8a6e5eed5e7e1890ab667ba56e17632ae0))

# [1.8.0](https://github.com/navapbc/labs-asp/compare/v1.7.0...v1.8.0) (2026-03-17)


### Bug Fixes

* browser back button to close chat ([6b55e0e](https://github.com/navapbc/labs-asp/commit/6b55e0ef821f58a04e0a9358df2584a39d1a8a80))
* **ci:** add workflow_dispatch fallback for preview cleanup on conflicting PRs ([51d9280](https://github.com/navapbc/labs-asp/commit/51d9280bfb7198dd5a3d5400dc10222c4cd1b156))
* small UI fixes to the form summary card ([45f653f](https://github.com/navapbc/labs-asp/commit/45f653f5fa12b191476e48e4cdf6ab2cfc9c7911))
* visual bug for conversation checkpoint ([f15a6e0](https://github.com/navapbc/labs-asp/commit/f15a6e0429905661d0d36a7e0928a5c6ab9e5e12))


### Features

* addition of the shimmer on the tool calls grouping ([6a9d416](https://github.com/navapbc/labs-asp/commit/6a9d416a5806d8475691d1cfd1a7a0d695753fde))
* record kernel browser session replays and log view URLs on cleanup ([857bbcc](https://github.com/navapbc/labs-asp/commit/857bbcc2c722ef397da29c0709c5dfa56adb5a7b))
* update client submodule with browser navigation guardrails ([de033de](https://github.com/navapbc/labs-asp/commit/de033de8a7a314c3e7312689be86d95b553ff223))

# [1.7.0](https://github.com/navapbc/labs-asp/compare/v1.6.1...v1.7.0) (2026-03-06)


### Bug Fixes

* add precompact and saveNewMessages functions ([0389f97](https://github.com/navapbc/labs-asp/commit/0389f97c8d58b1c1bbf8d72922e702c37c3aa514))
* prompt edits for forms ([b9f78b2](https://github.com/navapbc/labs-asp/commit/b9f78b23c72bdd661420d0a3044a923822405c2b))
* prompt page input to a responsive textarea ([4fae2df](https://github.com/navapbc/labs-asp/commit/4fae2df8eadb8653471ed574e4cab42efeb8c90f))
* remove destroyed preview database URL secret data source (VM is count=0, was unused) ([d6052e9](https://github.com/navapbc/labs-asp/commit/d6052e971f25d9a7bf9d0616101e2d80e89354f9))
* scrollbar switched from scroll to auto ([fd7ba7e](https://github.com/navapbc/labs-asp/commit/fd7ba7e5e2c4ecaed5dcb90c2a2718781562b6e5))
* update client submodule — checkpoint card UI + compaction persistence ([21af763](https://github.com/navapbc/labs-asp/commit/21af763be352643b30dcdfaabf13057dba9a4ac6))
* update client submodule — checkpoint UI + Sonnet provider switch ([af341fb](https://github.com/navapbc/labs-asp/commit/af341fb16a12af72b5eb7aa035cb1a4661f676bf))
* update client submodule — compressor logging + checkpoint UI fix ([bd8bdb2](https://github.com/navapbc/labs-asp/commit/bd8bdb281eae76e5b62a80f1ba2fb648da39c017))
* update client submodule — compressor rewrite for reliable summarization ([2d138b5](https://github.com/navapbc/labs-asp/commit/2d138b51604a7a30f931f7e87bfab17ed443bd01))
* update client submodule for token-based compaction ([81c989b](https://github.com/navapbc/labs-asp/commit/81c989b2ff7ce4d287704b6b7757cbf1e346894c))
* use indexed reference for replace_triggered_by in count=0 resource ([0adce4c](https://github.com/navapbc/labs-asp/commit/0adce4cc205bbfa30ebfd61e88ab632da6c269d4))
* use removed block to drop browser-ws-proxy from state without destroying ([e1201a3](https://github.com/navapbc/labs-asp/commit/e1201a38f0fb14d869d8496423925f0f07a3a4c0))


### Features

* new landing page prompt ([3dbbe61](https://github.com/navapbc/labs-asp/commit/3dbbe61befc9d1c00922b03ada34fb63d8a34c87))
* use of the Vercel prepare step and token usage ([6afb3c9](https://github.com/navapbc/labs-asp/commit/6afb3c923207cbe26eb41a7e133700b3c31f9f9c))

## [1.6.1](https://github.com/navapbc/labs-asp/compare/v1.6.0...v1.6.1) (2026-02-23)


### Bug Fixes

* added prompt changes and skip for now language change ([fb45482](https://github.com/navapbc/labs-asp/commit/fb45482813502c7b92e66bfa58b7ea40f0ba5b83))

# [1.6.0](https://github.com/navapbc/labs-asp/compare/v1.5.0...v1.6.0) (2026-02-20)


### Bug Fixes

* css edits for the form summary ([47ec532](https://github.com/navapbc/labs-asp/commit/47ec532abcffe3d1872f073f014745dab6fc799b))
* remove duplicate control mode toasts and improve send button UX ([67e997a](https://github.com/navapbc/labs-asp/commit/67e997a3f9b5691d9034d24f3666c956ebddabda))


### Features

* improve tool and skill instructions for Sonnet 4.6 ([242e959](https://github.com/navapbc/labs-asp/commit/242e9591bdc26eaa159a49d6616393a9b331ce22))
* upgrade to claude-sonnet-4-6 and GOOGLE_VERTEX_LOCATION to global ([ce7209a](https://github.com/navapbc/labs-asp/commit/ce7209abdda49249dd4c87790b82287483ab421d))

# [1.5.0](https://github.com/navapbc/labs-asp/compare/v1.4.3...v1.5.0) (2026-02-17)


### Bug Fixes

* remove captcha language ([6a4ab8d](https://github.com/navapbc/labs-asp/commit/6a4ab8ddd7d3c13be93f7f65e867a928eb44a2bb))


### Features

* add Posthog person_profiles with NextJS useSession data ([c45ed6f](https://github.com/navapbc/labs-asp/commit/c45ed6f8242439d2712e1bcc522b13afd0d9f5b7))

## [1.4.3](https://github.com/navapbc/labs-asp/compare/v1.4.2...v1.4.3) (2026-02-17)


### Bug Fixes

* fix the stop functionality for kernel ([0ebf73f](https://github.com/navapbc/labs-asp/commit/0ebf73fd3dabdcfeaf8eb88ae0d11d3666fe74a2))

## [1.4.2](https://github.com/navapbc/labs-asp/compare/v1.4.1...v1.4.2) (2026-02-13)


### Bug Fixes

* adjust agent-browser skills ([0ffd9dc](https://github.com/navapbc/labs-asp/commit/0ffd9dc107003968f3edb5d1d4e33b09839038d0))

## [1.4.1](https://github.com/navapbc/labs-asp/compare/v1.4.0...v1.4.1) (2026-02-12)


### Bug Fixes

* fix for client side env variables ([6a0e44f](https://github.com/navapbc/labs-asp/commit/6a0e44f95b6066584777a45f96d9c437d630ec9b))

# [1.4.0](https://github.com/navapbc/labs-asp/compare/v1.3.1...v1.4.0) (2026-02-11)


### Bug Fixes

* add execute permissions for agent-browser binary ([697fb33](https://github.com/navapbc/labs-asp/commit/697fb33c2fb4b5319d6a142908157b17247ac390))
* adding in a message queue for kernel ([7fa5655](https://github.com/navapbc/labs-asp/commit/7fa5655e7f7f1f22d871c10217b9210c34658e2e))
* adjust agent-browser skills reference documents ([5cd9f29](https://github.com/navapbc/labs-asp/commit/5cd9f29e5a988c8d0f6a17c24a775ac8e4348e9a))
* apricot data for ai sdk ([c2e57bd](https://github.com/navapbc/labs-asp/commit/c2e57bdd63754345c8415a382681d6f1c36e5b21))
* css fixes for design with skip logic to gap analysis ([1fe10d6](https://github.com/navapbc/labs-asp/commit/1fe10d66d3cdf7e247618915b6d966213ea730ae))
* enable AI SDK agent feature flag for dev environment ([a959f45](https://github.com/navapbc/labs-asp/commit/a959f4524d540daded16699f149947606a5f8085))
* enable session affinity on Cloud Run for persistent CDP connections ([07a55be](https://github.com/navapbc/labs-asp/commit/07a55be4affc6ff3e15eec2335d0e78ec8139f88))
* fix button colors for the take over ([a10d9b4](https://github.com/navapbc/labs-asp/commit/a10d9b4f493d4c8a219b3ff0212bd290b28f543f))
* fix env definition to configure correct Apricot API environment for prod and sandbox ([3d2f12f](https://github.com/navapbc/labs-asp/commit/3d2f12fa1fc4c2f60c7c59abbeaa7d29258f291b))
* fix for disconnect for kernel ([06ea98c](https://github.com/navapbc/labs-asp/commit/06ea98cbb012344438acfa9d5cd54fc10bc7285b))
* fix for flicker issue and model change ([549444a](https://github.com/navapbc/labs-asp/commit/549444a1f3a2e934b89fa08340efc9a69674a6e6))
* pass KERNEL_API_KEY as build arg for Next.js build ([a39ed83](https://github.com/navapbc/labs-asp/commit/a39ed83ff00923347c674a00094123bbe2f0549c))
* pass USE_AI_SDK_AGENT build arg for client-side feature flag ([7ddb9da](https://github.com/navapbc/labs-asp/commit/7ddb9da658809332b79e6f839e3f0fa79ee8e9d9))
* route all Cloud Run egress through VPC for static IP allowlisting ([1efa46d](https://github.com/navapbc/labs-asp/commit/1efa46d6d9c1163107abfceced1fcf9d989d5fb0))
* style changes to kernel ([229398d](https://github.com/navapbc/labs-asp/commit/229398d4c0e4950b9238b0a6f68ad7021496b147))
* tests for kernel browsing ([6e12de8](https://github.com/navapbc/labs-asp/commit/6e12de82e10956413f2c1b972161b27fad6cf6d2))
* update apricot-api logs to reference ENVIRONMENT ([bccd199](https://github.com/navapbc/labs-asp/commit/bccd199f279b978d0ec4d328d80a0f53db23956e))
* update client submodule - remove unsupported --timeout flag ([ac03c9f](https://github.com/navapbc/labs-asp/commit/ac03c9f76093f70fac62dcae8a5afdc18e879175))
* update client submodule (add @ai-sdk/anthropic dependency) ([33cf6b9](https://github.com/navapbc/labs-asp/commit/33cf6b9763846a7311493bc8bcf7f1d9855ab725))
* update client submodule (optional chaining fix) ([9514d11](https://github.com/navapbc/labs-asp/commit/9514d1124e90dd124066bd06c8f06138b8a45ae6))
* update client submodule (stderr error fix) ([d01fab7](https://github.com/navapbc/labs-asp/commit/d01fab760a74307903c53d27cf02147057ca5a89))
* update client submodule and add AI SDK feature flag to deploy ([c7b9df2](https://github.com/navapbc/labs-asp/commit/c7b9df26fd5e4636af10b246ad4bc92dcb53f1ac))
* update client submodule with missing files ([215a0ab](https://github.com/navapbc/labs-asp/commit/215a0ab3bac47d4256ab5d6d0741d768b3b37b32))
* update client submodule with OAuth user ID fix ([0b9395b](https://github.com/navapbc/labs-asp/commit/0b9395bf4c16d90662fab52dfb4448014c3703c4))


### Features

* add separate Apricot API credentials for prod and sandbox ([fcd78f6](https://github.com/navapbc/labs-asp/commit/fcd78f69613f2807bc7174f2a54c9517da921b71))
* add USE_AI_SDK feature flag to deploy workflow ([e053e82](https://github.com/navapbc/labs-asp/commit/e053e82d6a5d7144d588d145cdd7bede14429cf8))
* feature flag to create a guest login for preview branches ([b932297](https://github.com/navapbc/labs-asp/commit/b93229799f19e3c875e99e170d9dac5153ae021a))
* form field values from apricot api ([06e1a88](https://github.com/navapbc/labs-asp/commit/06e1a88c97c2e2eb57651c788bd8ca294bf8e2e5))
* migrate web automation to AI SDK and Kernel.sh ([08a0ead](https://github.com/navapbc/labs-asp/commit/08a0ead66e41b398447474d04ccc85f6783a9b2e))
* redis session locking and browser management on userid ([a9dad7e](https://github.com/navapbc/labs-asp/commit/a9dad7ee21f38f0666b259c85bbfca53b55924b6))
* tool grouping, gap analysis, prompt fixes ([0bf0c3f](https://github.com/navapbc/labs-asp/commit/0bf0c3f275f628995400ae7313881774fe2d94b2))

## [1.3.1](https://github.com/navapbc/labs-asp/compare/v1.3.0...v1.3.1) (2026-02-03)


### Bug Fixes

* fix env definition to configure correct Apricot API environment for prod and sandbox ([4ebb214](https://github.com/navapbc/labs-asp/commit/4ebb214f9d3d1095272e6eee523f700314b5a13d))
* update apricot-api logs to reference ENVIRONMENT ([b506893](https://github.com/navapbc/labs-asp/commit/b506893001c22bea9ce75758b99e106581d3a755))

# [1.3.0](https://github.com/navapbc/labs-asp/compare/v1.2.1...v1.3.0) (2026-01-30)


### Bug Fixes

* add qs override to fix security vulnerability ([8df1e37](https://github.com/navapbc/labs-asp/commit/8df1e378dead699f38cea3bda0bbf5aa8dab5ed5))
* clean up playwright tools ([de46518](https://github.com/navapbc/labs-asp/commit/de46518ec4535c271da61f9a288645fee055ec4d))
* disable scorers and remove unused title generation ([8f7953c](https://github.com/navapbc/labs-asp/commit/8f7953cb6f99f81138883821ca82c51366cad5ad))
* ignore CVE-2025-47273 (no patch available for MCP SDK) ([ae673c2](https://github.com/navapbc/labs-asp/commit/ae673c254d1bfd06025d9d8383c28b8c5cec8f5a))
* ignore CVE-2026-0621 (no patch available for MCP SDK) ([f95c902](https://github.com/navapbc/labs-asp/commit/f95c902e58b4499a8d9986e2d83fcafa382d6142))
* loading screen fix for web browser ([5bd7625](https://github.com/navapbc/labs-asp/commit/5bd7625dd17c7ca907a2a68eb69c6d88810bbade))
* remove call for get apricot users ([f00c153](https://github.com/navapbc/labs-asp/commit/f00c153807864f892173922352ba157041366900))
* shared link redirect issues ([f06d443](https://github.com/navapbc/labs-asp/commit/f06d4437d957129c733b6c664d7ba1f6a532800a))
* skip NEXTAUTH_URL for preview envs, use Cloud Run URL ([0c2c41d](https://github.com/navapbc/labs-asp/commit/0c2c41d91df1e95590d0a9d00218a743ec7ba08c))
* skip NEXTAUTH_URL for preview envs, use origin fallback ([df0d31b](https://github.com/navapbc/labs-asp/commit/df0d31b0ef2a08309c0f4545fe9729284e1ddf8c))
* **terraform:** allow preview to create dev storage bucket ([554f68f](https://github.com/navapbc/labs-asp/commit/554f68f2e01ff5a49f6f61099aef5788d58a9822))
* **terraform:** remove public access from internal services (browser-mcp, browser-streaming) ([be5fc07](https://github.com/navapbc/labs-asp/commit/be5fc07f7fc18eaa58b541c2f7b04f43d42ce0d8))
* tests on workflow ([fb1eef7](https://github.com/navapbc/labs-asp/commit/fb1eef77085a9ab6a9e791a4f280a9636c226d9f))
* update client submodule with request URL fallback ([13fcc3d](https://github.com/navapbc/labs-asp/commit/13fcc3dab210814dfa8870ca451556abb12c09a1))
* use Cloud Run URL for NEXTAUTH_URL in preview envs ([91caef6](https://github.com/navapbc/labs-asp/commit/91caef6e8e10379ca150741e9a244058d84f0178))
* use data source for dev bucket in preview environments ([03483f1](https://github.com/navapbc/labs-asp/commit/03483f1378b0d062a1610a09c15406b9ac5d4af9))
* use data source for dev bucket in preview environments ([ba13d49](https://github.com/navapbc/labs-asp/commit/ba13d4904ccfda63fd9f3e2134b4d358b934e04d))
* use google() for scorer and title models to satisfy TypeScript types ([7d4da6e](https://github.com/navapbc/labs-asp/commit/7d4da6ee2b189869cce9917eb3b2ebd4523aecc6))
* use Mastra model router format for all models to fix AI SDK v4/v5 compatibility ([bb9f88d](https://github.com/navapbc/labs-asp/commit/bb9f88dcbf67f3e6bd77c1bb16b049fb6aa05a45))
* use Mastra model router format for gemini-3-pro-preview ([3d4b6cd](https://github.com/navapbc/labs-asp/commit/3d4b6cde30d285083f6702cef557b4e34983ddfa))
* use string format for title generation model to fix AI SDK v4/v5 error ([5a11bef](https://github.com/navapbc/labs-asp/commit/5a11bef7d0526118ec5277d6f09a21ca076e3c92))


### Features

* add in a captcha alert to take over the browser ([8e8f0bf](https://github.com/navapbc/labs-asp/commit/8e8f0bf76ddb874dee214a2939b0129e08b08db7))
* add in API call to get record by id ([7170cb1](https://github.com/navapbc/labs-asp/commit/7170cb152b159a9fb1b5d1f04bbbab1341ad98fa))
* add JSON payload support for shared link API ([5ba3097](https://github.com/navapbc/labs-asp/commit/5ba3097794f5df9d4d0312e0bad3bcd5a75d2ced))
* add postgres with pgvector to docker-compose ([013c0e7](https://github.com/navapbc/labs-asp/commit/013c0e7d8185cdcee75c1abfeaf52fd5c1c8d3f5))
* add Upstash Redis for shared links ([faaee82](https://github.com/navapbc/labs-asp/commit/faaee82e557af8bc34c02a97622516882be7e52f))
* prod data for apricot ([227bc41](https://github.com/navapbc/labs-asp/commit/227bc41f6ce7e72d61bf92359c9abe9b37283969))
* removal of guest mode and auth check ([bb2e41e](https://github.com/navapbc/labs-asp/commit/bb2e41ecc808a3a6dfc4216f4b7d21002f44e1de))
* update client submodule with shared link API ([547138b](https://github.com/navapbc/labs-asp/commit/547138b831fc2740e287ca94970de27b819aa610))


### Reverts

* restore cloud_run.tf and client to working state ([672c9a5](https://github.com/navapbc/labs-asp/commit/672c9a5061d9d52317881213ecf957fa5122711d))

## [1.2.1](https://github.com/navapbc/labs-asp/compare/v1.2.0...v1.2.1) (2025-12-26)


### Bug Fixes

* add depends on ([0a859cd](https://github.com/navapbc/labs-asp/commit/0a859cd1a86c2d664fdab6367c09270bc00f0adc))
* terraform upgrade terraform provider to 7.0 for PSC ip_address ([b86884f](https://github.com/navapbc/labs-asp/commit/b86884f99582f0be198c72a0e3a3e44b02b5ad9a))
* **terraform:** generate DATABASE_URL secrets from Cloud SQL outputs ([d364ac3](https://github.com/navapbc/labs-asp/commit/d364ac33c6ab1830ce91d2c1cbb60acb1cd1ae22))
* use one() for set indexing on psc_config ([d27dfce](https://github.com/navapbc/labs-asp/commit/d27dfce9ad4d345312764c123429865c4d8d7ca9))

# [1.2.0](https://github.com/navapbc/labs-asp/compare/v1.1.1...v1.2.0) (2025-12-23)


### Features

* **terraform:** replace VM on image change instead of reset ([ed1d575](https://github.com/navapbc/labs-asp/commit/ed1d575dc2392a179cbd76f1cb614c00f58fa8f1))
