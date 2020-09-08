import { ServiceClient } from '../JSONRPC20/ServiceClient.ts';
import { JSONRPC20Error } from '../JSONRPC20/JSONRPC20.ts';
import { JSONObject } from "../../json.ts";

export type SDKBoolean = 0 | 1;

export interface SearchObjectsParams {
    match_filter: {
        full_text_in_all: string,
        exclude_subobjects: SDKBoolean,
        source_tags: Array<string>,
        source_tags_blacklist: SDKBoolean
    },
    pagination: {
        start: number,
        count: number
    },
    post_processing: {
        ids_only: SDKBoolean,
        skip_info: SDKBoolean,
        skip_keys: SDKBoolean,
        skip_data: SDKBoolean,
        include_highlights: SDKBoolean,
        add_narrative_info: SDKBoolean
    },
    access_filter: {
        with_private: SDKBoolean,
        with_public: SDKBoolean
    },
    sorting_rules: Array<{
        is_object_property: SDKBoolean,
        property: string,
        ascending: SDKBoolean
    }>
}

export interface SearchObjectsResult {
    pagination: {
        start: number,
        count: number
    },
    sorting_rules: Array<{
        is_object_property: SDKBoolean,
        property: string,
        ascending: SDKBoolean
    }>,
    total: number,
    search_time: number,
    objects: Array<{
        object_name: string,
        access_group: number,
        obj_id: number,
        version: number,
        timestamp: number,
        type: string,
        creator: string,
        data: JSONObject,
        key_props: JSONObject,
        guid: string,
        kbase_id: string,
        index_name: string,
        type_ver: 0,
        highlight: {
            [key: string]: Array<string>
        }
    }>
}

// Search types

export interface SearchTypesParams {
    match_filter: {
        full_text_in_all: string,
        exclude_subobjects: SDKBoolean,
        source_tags: Array<string>,
        source_tags_blacklist: SDKBoolean
    },
    access_filter: {
        with_private: SDKBoolean,
        with_public: SDKBoolean
    }
}

export interface SearchTypesResult {
    type_to_count: {
        [typeKey: string]: number
    };
    search_time: number;
}

// Implementation

export default class Search2LegacyClient extends ServiceClient {
    module: string = 'KBaseSearchEngine';

    // Note wrapping params and result in []. The api is jsonrpc 2.0, but uses jsonrpc 1.1 
    // array wrapping.
    async searchObjects(param: SearchObjectsParams): Promise<SearchObjectsResult> {
        const [result] = await this.callFunc<[SearchObjectsParams], [SearchObjectsResult]>('search_objects', [param]);
        return result;
    }

    async searchTypes(param: SearchTypesParams): Promise<SearchTypesResult> {
        const [result] = await this.callFunc<[SearchTypesParams], [SearchTypesResult]>('search_types', [param]);
        return result;
    }

}
