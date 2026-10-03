import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

/**
 * Reusable "Custom Fields" fixedCollection property. GetSales custom field
 * values are sent as a plain {name_or_uuid: value} object, but a collection
 * of Name/Value pairs is a nicer n8n UI than asking users to hand-write JSON.
 */
export function customFieldsProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'fixedCollection',
		placeholder: 'Add Custom Field',
		default: {},
		typeOptions: { multipleValues: true },
		displayOptions: { show: { resource: [resource], operation: operations } },
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{ displayName: 'Name or UUID', name: 'name', type: 'string', default: '', description: 'Custom field name (e.g. "Annual Revenue") or its UUID' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	};
}

export function customFieldsToObject(
	context: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const raw = context.getNodeParameter('customFields', itemIndex, {}) as {
		field?: Array<{ name: string; value: string }>;
	};
	if (!raw.field || raw.field.length === 0) return undefined;

	const result: IDataObject = {};
	for (const { name, value } of raw.field) {
		if (name) result[name] = value;
	}
	return result;
}
