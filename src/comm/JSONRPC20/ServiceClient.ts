import { JSONValue } from "../../json.ts";
import { JSONRPCClient } from './JSONRPC20.ts';

export interface ServiceClientParams {
    url: string;
    timeout: number;
    authorization?: string;
}

export abstract class ServiceClient {
    abstract module: string;
    url: string;
    timeout: number;
    authorization?: string;
    constructor({ url, timeout, authorization }: ServiceClientParams) {
        this.url = url;
        this.timeout = timeout;
        this.authorization = authorization;
    }

    async callFunc<ParamType, ReturnType>(funcName: string, params: ParamType): Promise<ReturnType> {
        const client = new JSONRPCClient({ 
            url: this.url, 
            timeout: this.timeout, 
            authorization: this.authorization 
        });
        const method = `${this.module}.${funcName}`;
        const methodParams = (params as unknown) as JSONValue;
        const result = await client.callMethod(method, methodParams, { timeout: this.timeout });

        return (result as unknown) as ReturnType;
    }
}
