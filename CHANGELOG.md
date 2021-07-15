# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.0.0](https://github.com/jorgenkg/promise-priority-queue/compare/v3.0.0...v4.0.0) (2021-07-15)


### ⚠ BREAKING CHANGES

* removed all-caps PAUSE flag and replaced it by a `isPaused()` getter fn.

### Bug Fixes

* renamed PAUSE -> isPaused() ([d0ac713](https://github.com/jorgenkg/promise-priority-queue/commit/d0ac7137a116f70a515d40e7c0abbd9d920d57e6))

## [3.0.0](https://github.com/jorgenkg/promise-priority-queue/compare/v2.0.0...v3.0.0) (2021-07-15)


### ⚠ BREAKING CHANGES

* make internal bucketQueue property private and add comments
* moved internal events such as pause, resume, complete and add-task to a private emitter to prevent unintentional pollution from external sources
* removed the `bucketCount` parameter from the queue constructor. Instead, the queue may be dynamically expanded at runtime.

### Features

* remove bucketCount parameter ([e7cdcfa](https://github.com/jorgenkg/promise-priority-queue/commit/e7cdcfa49844cb7a279363bdfc6b8a8ff4c4a7e7))
* removed generator, stricter typing and moved internal events to a private emitter ([da6f5ae](https://github.com/jorgenkg/promise-priority-queue/commit/da6f5ae4c4f6b692c59ff4b0f91767a3a7c43267))
* rewritten as typescript ([3e17cdb](https://github.com/jorgenkg/promise-priority-queue/commit/3e17cdb8d48c54d186b314126c9a0dac4b6f1e70))


### Bug Fixes

* concurrency regression bug ([a41c531](https://github.com/jorgenkg/promise-priority-queue/commit/a41c531b05029d86348863fbbe7ad777cb161949))
* make internal bucketQueue property private and add comments ([5ecc379](https://github.com/jorgenkg/promise-priority-queue/commit/5ecc379612fc211fa8c9b977fd4c5baceaed8e2e))

### [2.0.1](https://github.com/jorgenkg/promise-priority-queue/compare/v2.0.0...v2.0.1) (2020-07-15)


### Bug Fixes

* concurrency regression bug ([a41c531](https://github.com/jorgenkg/promise-priority-queue/commit/a41c531b05029d86348863fbbe7ad777cb161949))

## [2.0.0](https://github.com/jorgenkg/promise-priority-queue/compare/v1.0.2...v2.0.0) (2020-07-14)


### ⚠ BREAKING CHANGES

* updated queue constructor to make the API easier to use

### Bug Fixes

* improved code flow ([b1e468b](https://github.com/jorgenkg/promise-priority-queue/commit/b1e468b35bc9bb15831ab5e62949a048554318ce))


* updated constructor and readme ([8dcf2df](https://github.com/jorgenkg/promise-priority-queue/commit/8dcf2dfbfe580893f00ad6fe9477cae80edc5430))

### [1.0.2](https://github.com/jorgenkg/promise-priority-queue/compare/v1.0.1...v1.0.2) (2020-07-14)
