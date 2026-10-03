import type { IDataObject } from 'n8n-workflow';

export interface GetSalesPage {
	items: IDataObject[];
	hasMore: boolean;
}

/**
 * Shared "Return All" pagination loop for GetSales list endpoints.
 * `fetchPage` is a small closure the caller provides that knows how that
 * specific endpoint expects limit/offset (query string vs. request body) and
 * how to read its response shape (most endpoints return a flat
 * {data,has_more}; the Emails endpoint nests it under `pagination` instead).
 */
export async function getsalesFetchAllPages(
	fetchPage: (limit: number, offset: number) => Promise<GetSalesPage>,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	if (!returnAll) {
		const page = await fetchPage(limit, 0);
		return page.items;
	}

	const pageSize = 100; // documented max page size
	let offset = 0;
	const results: IDataObject[] = [];
	let hasMore = true;

	while (hasMore) {
		const page = await fetchPage(pageSize, offset);
		results.push(...page.items);
		hasMore = page.hasMore;
		offset += pageSize;
	}

	return results;
}
