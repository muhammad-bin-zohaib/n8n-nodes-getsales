import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';

export const GETSALES_API_BASE_URL = 'https://amazing.getsales.io';

type GetSalesContext = IExecuteFunctions | IHookFunctions | IWebhookFunctions;

/**
 * Shared request helper for the GetSales REST API: builds the URL against the
 * documented production server, authenticates via the GetSales API credential,
 * and normalizes thrown errors into NodeApiError so reason/message/status
 * surface to the user instead of being swallowed.
 */
export async function getsalesApiRequest(
	this: GetSalesContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
	itemIndex?: number,
): Promise<IDataObject> {
	const options = {
		method,
		url: `${GETSALES_API_BASE_URL}${endpoint}`,
		json: true,
		...(body && Object.keys(body).length ? { body } : {}),
		...(qs && Object.keys(qs).length ? { qs } : {}),
	};

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'getSalesApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(
			this.getNode(),
			error as JsonObject,
			itemIndex !== undefined ? { itemIndex } : undefined,
		);
	}
}
