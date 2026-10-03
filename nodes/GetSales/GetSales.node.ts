import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { contactFields, contactOperations, executeContact } from './actions/contact';
import { companyFields, companyOperations, executeCompany } from './actions/company';
import { linkedinFields, linkedinOperations, executeLinkedIn } from './actions/linkedin';
import { emailFields, emailOperations, executeEmail } from './actions/email';
import { flowFields, flowOperations, executeFlow } from './actions/flow';

export class GetSales implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GetSales',
		name: 'getSales',
		icon: 'file:getsales.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage contacts, companies, LinkedIn messages, emails, and flows in GetSales',
		defaults: { name: 'GetSales' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'getSalesApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Email', value: 'email' },
					{ name: 'Flow', value: 'flow' },
					{ name: 'LinkedIn', value: 'linkedin' },
				],
				default: 'contact',
			},
			...contactOperations,
			...companyOperations,
			...linkedinOperations,
			...emailOperations,
			...flowOperations,
			...contactFields,
			...companyFields,
			...linkedinFields,
			...emailFields,
			...flowFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let responseData: IDataObject | IDataObject[];

				if (resource === 'contact') {
					responseData = await executeContact.call(this, operation, i);
				} else if (resource === 'company') {
					responseData = await executeCompany.call(this, operation, i);
				} else if (resource === 'linkedin') {
					responseData = await executeLinkedIn.call(this, operation, i);
				} else if (resource === 'email') {
					responseData = await executeEmail.call(this, operation, i);
				} else if (resource === 'flow') {
					responseData = await executeFlow.call(this, operation, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// getsalesApiRequest already throws NodeApiError for API failures; wrapping
				// an already-typed error here just reuses its message, it doesn't nest it.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
