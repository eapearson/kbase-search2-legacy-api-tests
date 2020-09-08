import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {parse as parseYaml} from "https://deno.land/std/encoding/yaml.ts";

import Search2LegacyClient, { SearchObjectsParams, SearchObjectsResult } from './comm/coreServices/Search2LegacyClient.ts'
import { JSONObject } from "./json.ts";

export interface Config {
  username: string;
  token: string;
}

const CONFIG = (parseYaml(Deno.readTextFileSync('./config.yaml')) as unknown) as Config;
const METHOD = 'search_objects';

// private config from environment variables.
const TOKEN = Deno.env.get('TOKEN');
if (!TOKEN) {
  console.error('TOKEN not provided as env var');
  Deno.exit(1);
}
// private config is used to patch the global config object.
CONFIG.token = TOKEN;

const testCases = [
  {
    number: 1,
    name: 'search for "Prochlorococcus" with all standard features enabled, disabled (same as data-search)'
  },
  {
    number: 2,
    name: 'search for "Prochlorococcus" without highlights'
  },
  {
    number: 3,
    name: 'search for "Prochlorococcus" without narrative info'
  },
  {
    number: 4,
    name: 'search for "Prochlorococcus" without key props'
  },
  {
    number: 5,
    name: 'search for "Prochlorococcus" without key data'
  },
  {
    number: 6,
    name: 'search for "Prochlorococcus" without info (should be no effect ?!)'
  },
  {
    number: 7,
    name: 'search for "Prochlorococcus" with ids_only (broken)'
  },
  {
    number: 8,
    name: 'search for "Prochlorococcus" without object info'
  }
];

testCases.forEach(({number, name}) => {
    const params = (JSON.parse(Deno.readTextFileSync(`./testData/${METHOD}/search2-test${number}-params.json`)) as unknown) as SearchObjectsParams;
    const expected = (JSON.parse(Deno.readTextFileSync(`./testData/${METHOD}/search2-test${number}-result.json`)) as unknown) as SearchObjectsResult;
    
    Deno.test({
      name,
      async fn() {
        const client = new Search2LegacyClient({
          url: 'https://ci.kbase.us/services/searchapi2/legacy',
          timeout: 10000,
          authorization: CONFIG.token
        });
        const result = await client.searchObjects(params);
    
        // we don't want to test against the search time, since it is variable
        const resultFixed = ((Object.assign({}, result) as unknown) as JSONObject)
        delete resultFixed.search_time;

        const expectationFixed = ((Object.assign({}, expected) as unknown) as JSONObject)
        delete expectationFixed.search_time;
    
        assertEquals(resultFixed, expectationFixed);
      },
    });
});
