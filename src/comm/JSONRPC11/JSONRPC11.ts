import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { StringReader } from "https://deno.land/std/io/mod.ts";
import { isJSONObject, JSONValue } from '../../json.ts';


export interface JSONRPCRequestOptions {
    func: string,
    params: any,
    timeout?: number,
    authorization?: string;
}

// The JSON RPC Request parameters
// An array of  JSON objects
export interface JSONRPCParam {
    [key: string]: any;
}

// The entire JSON RPC request object
export interface JSONRPCRequest {
    method: string,
    version: '1.1',
    id: string,
    params: Array<JSONRPCParam>,
    context?: any;
}

export interface JSONRPCErrorInfo {
    code: string,
    status?: number,
    message: string,
    detail?: string;
    data?: any;
}

// export class JSONRPCError extends Error {
//     code: string;
//     message: string;
//     detail?: string;
//     data?: any;
//     constructor(errorInfo: JSONRPCErrorInfo) {
//         super(errorInfo.message);
//         this.name = 'JSONRPCError';

//         this.code = errorInfo.code;
//         this.message = errorInfo.message;
//         this.detail = errorInfo.detail;
//         this.data = errorInfo.data;
//         this.stack = (<any>new Error()).stack;
//     }
// }

export interface JSONRPCClientParams {
    url: string,
    timeout: number;
    authorization?: string;
}

export interface JSONPayload {
    version: string;
    method: string;
    id: string;
    params: Array<JSONValue>;
}

export interface JSONRPC11Error {
    name: string;
    code: number;
    message: string;
    error: JSONValue;
}

export type JSONRPCError = JSONRPC11Error;

export class JSONRPC11Exception extends Error {
    error: JSONRPC11Error;
    constructor(error: JSONRPCError) {
        super(error.message);
        this.error = error;
    }
}

export interface JSONResponseBase {
    version: '1.1';
    id: string | number;
}

export interface JSONRPCResponseResult extends JSONResponseBase {
    result: Array<JSONValue>;
    error: null;
}

export interface JSONRPCResponseError extends JSONResponseBase {
    result: null;
    error: JSONRPCError;
}

export type JSONRPCResponse = JSONRPCResponseResult | JSONRPCResponseError;

export class JSONRPCClient {
    url: string;
    timeout: number;
    authorization?: string;
    constructor({ url, timeout, authorization }: JSONRPCClientParams) {
        this.url = url;
        this.timeout = timeout;
        this.authorization = authorization;
    }

    // isGeneralError(error: GeneralError) {
    //     return (error instanceof GeneralError);
    // }


    protected makePayload(method: string, params: Array<JSONRPCParam>): JSONPayload {
        return {
            version: '1.1',
            method,
            id: v4.generate(),
            params: params
        };
    }

    /*
    code 	message 	meaning
-32700 	Parse error 	Invalid JSON was received by the server.
An error occurred on the server while parsing the JSON text.
-32600 	Invalid Request 	The JSON sent is not a valid Request object.
-32601 	Method not found 	The method does not exist / is not available.
-32602 	Invalid params 	Invalid method parameter(s).
-32603 	Internal error 	Internal JSON-RPC error.
-32000 to -32099 	Server error 	Reserved for implementation-defined server-errors.
    */

    ensureValidResponse(rawResponse: string): JSONRPCResponse {
        let jsonResponse: JSONValue;
        try {
            jsonResponse = (JSON.parse(rawResponse) as unknown) as JSONValue;
        } catch (ex) {
            throw new JSONRPC11Exception({
                name: 'parse error',
                code: 100,
                message: 'The response from the service could not be parsed',
                error: {
                    originalMessage: ex.message,
                    responseText: rawResponse
                }
            });
        }
        if (!isJSONObject(jsonResponse)) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: 'The request JSON is not an object',
                error: {
                }
            });
        }
        if (!('version' in jsonResponse)) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: 'The request object does not include the "version" property',
                error: {
                }
            })
        }
        if (jsonResponse.version !== '1.1') {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: `The request object version must be "1.1", but is ${jsonResponse.version}`,
                error: {
                }
            })
        } 
        if (!('id' in jsonResponse)) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: 'The request object does not include the "id" property (spec optional, but required for KBase)',
                error: {
                }
            })
        }
        if (!['string', 'number'].includes(typeof jsonResponse.id)) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: `The request id must be a "string" or "integer" value, but is ${typeof jsonResponse.id}`,
                error: {
                }
            })
        }
        if (!(('result' in jsonResponse) || ('error' in jsonResponse))) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: 'The request object must include either a "result" or "error" property',
                error: {
                }
            })
        }

        if (('result' in jsonResponse) && ('error' in jsonResponse)) {
            throw new JSONRPC11Exception({
                name: 'Invalid Request',
                code: -32600,
                message: 'The request object must not include both the "result" and "error" property',
                error: {
                }
            })
        }

        return ((jsonResponse as unknown) as JSONRPCResponse);
    }

    async callMethod(method: string, params: Array<JSONRPCParam>, { timeout }: { timeout?: number; } = {}): Promise<Array<JSONValue>> {
        const payload = this.makePayload(method, params);
        // const rpc: JSONRPCRequest = {
        //     version: '1.1',
        //     method: method,
        //     id: uuid.v4(),
        //     params: [params],
        // };

        const header = new Headers();
        header.append('Content-Type', 'application/json');
        header.append('Accept', 'application/json');
        if (this.authorization) {
            header.append('Authorization', this.authorization);
        }

        const requestOptions: RequestInit = {
            method: 'POST',
            // timeout: timeout || this.timeout,
            body: JSON.stringify(payload),
            headers: header,

        };

        // const httpClient = new HTTPClient();
        const response: Response = await fetch(this.url, requestOptions);

        // let result: JSONRPCResponse;
        const rawBody = await response.text();

        const result: JSONRPCResponse = this.ensureValidResponse(rawBody);
        

        if (result.hasOwnProperty('error')) {
            const errorResult = (result as unknown) as JSONRPCResponseError;
            throw new JSONRPC11Exception({
                name: errorResult.error.name,
                code: errorResult.error.code,
                message: errorResult.error.message,
                error: errorResult.error.error
            });
        }

        // if (!(result instanceof Array)) {
        //     throw new JSONRPC11Exception({
        //         name: 'params not array',
        //         code: 100,
        //         message: 'Parameter is not an array',
        //         error: {}
        //     });
        // }
        const rpcResponse = (result as unknown) as JSONRPCResponseResult;
        return rpcResponse.result;
        // let x: T = ({} as unknown) as T;
        // return x;
    }
}