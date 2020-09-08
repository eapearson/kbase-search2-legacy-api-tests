# Tests for Search 2 Legacy API

These tests are designed to be run against CI, with the user "kbaseuitest".

## Status

Only tests against the search_objects and search_types methods are implemented.

Tests do not evaluate the accuracy of the index data, just the structure of the results.

Currently search_objects test 7, ids_only, and 8, add_access_group_info, are broken.

## Prerequisites

`deno` is the only requirement to run these tests. [Deno](https://deno.land/manual) is a new, simplified platform for javascript and typescript. It is used for these tests because testing is built-in, requires almost no setup, and has native support for Typescript (better test code, can re-use existing TS code.)

### MacOS

Deno is available from [macports](https://ports.macports.org/?search=deno&search_by=name) and [homebrew](https://formulae.brew.sh/formula/deno#default).

### Linux

Deno should be available for most linux distros.

## Running Tests

Running tests is simple, with just this invocation:

```bash
TOKEN=XXX deno test --allow-read --allow-net --allow-env
```

where XXX is a login token for the "kbaseuitest" user.

## Test Setup

Each test is defined by an array of "test cases" in the test file itself and in associated test case data files.

Each test file is named `METHOD.test.ts`, where `METHOD` is the legacy search2 api method being tested. 

Each test data file is named `testData/METHOD/search2-testN-params.json` and `testData/METHOD/search2-testN-result.json`, where `METHOD` is the legacy search2api method, N is the test number (matching the test number in the test cases). There is one test data file for the parameters, and one for the expected result.