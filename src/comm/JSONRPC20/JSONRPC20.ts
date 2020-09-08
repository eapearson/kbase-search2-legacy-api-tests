import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { StringReader } from "https://deno.land/std/io/mod.ts";
import { isJSONObject, isJSONValue, JSONObject, JSONValue } from '../../json.ts';


export interface JSONRPCRequestOptions {
    func: string,
    params: any,
    timeout?: number,
    authorization?: string;
}

// The JSON RPC Request parameters
// An array of  JSON objects
// export interface JSONRPCParam {
//     [key: string]: any;
// }

// The entire JSON RPC request object
export interface JSONRPCRequest {
    method: string;
    jsonrpc: '2.0';
    id: string | number | null;
    params?: JSONObject | JSONValue;
}

// export interface JSONRPCErrorInfo {
//     code: number;
//     message: string;
//     data?: JSONValue
// }

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

export type JSONRPC20ID = string | number | null;

// export interface JSONPayload {
//     version: string;
//     method: string;
//     id: string;
//     params: Array<JSONValue>;
// }

export interface JSONRPC20Error {
    code: number;
    message: string;
    data?: JSONValue;
}

export type JSONRPCError = JSONRPC20Error;

export class JSONRPC20Exception extends Error {
    error: JSONRPC20Error;
    constructor(error: JSONRPCError) {
        super(error.message);
        this.error = error;
    }
}

export interface JSONResponseBase {
    jsonrpc: '2.0';
    id: JSONRPC20ID;
}

export interface JSONRPCResponseResult extends JSONResponseBase {
    result: JSONValue;
}

export interface JSONRPCResponseError extends JSONResponseBase {
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


    protected makeRequest(method: string, params: JSONValue): JSONRPCRequest {
        return {
            jsonrpc: '2.0',
            method,
            id: v4.generate(),
            params
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
            throw new JSONRPC20Exception({
                // name: 'parse error',
                code: -32700,
                message: 'The response from the service could not be parsed',
                data: {
                    originalMessage: ex.message,
                    responseText: rawResponse
                }
            });
        }
        if (!isJSONObject(jsonResponse)) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: 'The request JSON is not an object',
                data: {
                }
            });
        }
        if (!('jsonrpc' in jsonResponse)) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: 'The request object does not include the "version" property',
                data: {
                }
            })
        }
        if (jsonResponse.jsonrpc !== '2.0') {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: `The request object version must be "1.1", but is ${jsonResponse.jsonrpc}`,
                data: {
                }
            })
        } 
        if (!('id' in jsonResponse)) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: 'The request object does not include the "id" property (spec optional, but required for KBase)',
                data: {
                }
            })
        }
        if (!['string', 'number', 'null'].includes(typeof jsonResponse.id)) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: `The request id must be a "string" or "integer" value, but is ${typeof jsonResponse.id}`,
                data: {
                }
            })
        }
        if (!(('result' in jsonResponse) || ('error' in jsonResponse))) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: 'The request object must include either a "result" or "error" property',
                data: {
                }
            })
        }

        if (('result' in jsonResponse) && ('error' in jsonResponse)) {
            throw new JSONRPC20Exception({
                // name: 'Invalid Request',
                code: -32600,
                message: 'The request object must not include both the "result" and "error" property',
                data: {
                }
            })
        }
        if ('result' in jsonResponse) {
            // This should be impossible!
            if (!isJSONValue(jsonResponse.result)) {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: 'The request "result" property is not a json value.',
                    data: {
                    }
                })
            }
        } else {
            if (!isJSONObject(jsonResponse.error)) {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: 'The request object "error" is not an object',
                    data: {
                    }
                })
            }

            if (!('code' in jsonResponse.error)) {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: 'The request "error" must include a numeric "code" property',
                    data: {
                    }
                })
            }

            if (typeof jsonResponse.error.code !== 'number') {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: `The request "error" "code" property must be a number (is ${typeof jsonResponse.error.code})`,
                    data: {
                    }
                })
            }

            if (!('message' in jsonResponse.error)) {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: 'The request "error" must include a "message" property',
                    data: {
                    }
                })
            }

            if (typeof jsonResponse.error.message !== 'string') {
                throw new JSONRPC20Exception({
                    // name: 'Invalid Request',
                    code: -32600,
                    message: `The request "error" "message" property must be a string (is ${typeof jsonResponse.error.message}`,
                    data: {
                    }
                })
            }
        }
        return ((jsonResponse as unknown) as JSONRPCResponse);
    }

    async callMethod(method: string, params: JSONValue, { timeout }: { timeout?: number; } = {}): Promise<JSONValue> {
        const request = this.makeRequest(method, params);
        const header = new Headers();
        header.append('Content-Type', 'application/json');
        header.append('Accept', 'application/json');
        if (this.authorization) {
            header.append('Authorization', this.authorization);
        }

        const requestOptions: RequestInit = {
            method: 'POST',
            // timeout: timeout || this.timeout,
            body: JSON.stringify(request),
            headers: header,

        };

        // const httpClient = new HTTPClient();
        const response: Response = await fetch(this.url, requestOptions);

        // let result: JSONRPCResponse;
        const rawBody = await response.text();

        const result: JSONRPCResponse = this.ensureValidResponse(rawBody);

        if (result.hasOwnProperty('error')) {
            console.error('ERROR', result);
            const errorResult = (result as unknown) as JSONRPCResponseError;
            throw new JSONRPC20Exception({
                // name: errorResult.error.name,
                code: errorResult.error.code,
                message: errorResult.error.message,
                data: errorResult.error.data
            });
        }
        const rpcResponse = (result as unknown) as JSONRPCResponseResult;
        return rpcResponse.result;
    }
}