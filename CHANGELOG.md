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
