import { ServiceWizardClient, GetServiceStatusResult, ServiceStatus } from '../coreServices/ServiceWizard.ts';
import { ServiceClient, ServiceClientParams } from './ServiceClient.ts';
import Cache from '../Cache.ts';

const ITEM_LIFETIME = 1800000;
const MONITORING_FREQUENCY = 60000;
const WAITER_TIMEOUT = 30000;
const WAITER_FREQUENCY = 100;

interface ModuleInfo {
    module_name: string;
}

var moduleCache = new Cache<ServiceStatus>({
    itemLifetime: ITEM_LIFETIME,
    monitoringFrequency: MONITORING_FREQUENCY,
    waiterTimeout: WAITER_TIMEOUT,
    waiterFrequency: WAITER_FREQUENCY
});

/*
 * arg is:
 * url - service wizard url
 * timeout - request timeout
 * version - service release version or tag
 * auth - auth structure
 *   token - auth token
 *   username - username
 * rpcContext
 */

export interface DynamicServiceClientParams extends ServiceClientParams {
    version?: string;
}


export abstract class DynamicServiceClient extends ServiceClient {
    version: string | null;

    abstract module: string;

    serviceDiscoveryURL: string;
    serviceDiscoveryModule: string = 'ServiceWizard';

    constructor(params: DynamicServiceClientParams) {
        super(params);
        const { version } = params;


        this.version = version || null;
        if (this.version === 'auto') {
            this.version = null;
        }

        this.serviceDiscoveryURL = params.url;
    }

    private moduleId() {
        let moduleId;
        if (!this.version) {
            moduleId = this.module + ':auto';
        } else {
            moduleId = this.module + ':' + this.version;
        }
        return moduleId;
    }

    private getCached(fetcher: () => Promise<GetServiceStatusResult>) {
        return moduleCache.getItemWithWait({
            id: this.moduleId(),
            fetcher: fetcher
        });
    }

    private async lookupModule(): Promise<GetServiceStatusResult> {
        const moduleInfo = await this.getCached(
            (): Promise<GetServiceStatusResult> => {
                const client = new ServiceWizardClient({
                    url: this.serviceDiscoveryURL!,
                    authorization: this.authorization,
                    timeout: this.timeout
                });
                // NB wrapped in promise.resolve because the promise we have 
                // here is bluebird, which supports cancellation, which we need.
                return Promise.resolve(
                    client.getServiceStatus({
                        module_name: this.module,
                        version: this.version
                    })
                );
            }
        );
        this.module = moduleInfo.module_name;
        this.url = moduleInfo.url;
        return moduleInfo;
    }

    async callFunc<ParamType, ReturnType>(funcName: string, params: ParamType): Promise<ReturnType> {
        await this.lookupModule();
        return super.callFunc(funcName, params);
    }
}
