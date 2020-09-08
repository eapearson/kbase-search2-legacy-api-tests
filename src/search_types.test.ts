import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import {parse as parseYaml} from "https://deno.land/std/encoding/yaml.ts";

import Search2LegacyClient, { SearchTypesParams, SearchTypesResult } from './comm/coreServices/Search2LegacyClient.ts'
import { JSONObject } from "./json.ts";

export interface Config {
  username: string;
  token: string;
}

const METHOD = 'search_types';
const CONFIG = (parseYaml(Deno.readTextFileSync('./config.yaml')) as unknown) as Config;

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
  }
];

testCases.forEach(({number, name}) => {
    const params = (JSON.parse(Deno.readTextFileSync(`./testData/${METHOD}/search2-test${number}-params.json`)) as unknown) as SearchTypesParams;
    const expected = (JSON.parse(Deno.readTextFileSync(`./testData/${METHOD}/search2-test${number}-result.json`)) as unknown) as SearchTypesResult;
    
    Deno.test({
      name,
      async fn() {
        const client = new Search2LegacyClient({
          url: 'https://ci.kbase.us/services/searchapi2/legacy',
          timeout: 10000,
          authorization: CONFIG.token
        });
        const result = await client.searchTypes(params);
    
        // we don't want to test against the search time, since it is variable
        const resultFixed = ((Object.assign({}, result) as unknown) as JSONObject)
        delete resultFixed.search_time;

        const expectationFixed = ((Object.assign({}, expected) as unknown) as JSONObject)
        delete expectationFixed.search_time;
    
        assertEquals(resultFixed, expectationFixed);
      },
    });
});
