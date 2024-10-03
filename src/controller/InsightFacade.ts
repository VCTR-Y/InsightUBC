import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(
			`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		if (isQuery(query)) {
			//console.log(query);
		} else {
			throw new InsightError("Invalid JSON");
		}
		throw new InsightError("Other error");
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}

interface MCOMPARATOR {
	GT?: Record<string, number>;
	LT?: Record<string, number>;
	EQ?: Record<string, number>;
}

interface SCOMPARATOR {
	IS?: Record<string, string>;
}

type FILTER = SCOMPARATOR | MCOMPARATOR | LOGICCOMPARATOR;

interface LOGICCOMPARATOR {
	AND?: FILTER[];
	OR?: FILTER[];
	NOT?: FILTER;
}

type WhereObject = FILTER;

interface OptionsObject {
	COLUMNS: string[];
	ORDER?: string;
}

interface QueryObject {
	WHERE: WhereObject;
	OPTIONS: OptionsObject;
}

function isQuery(object: any): object is QueryObject {
	return typeof object === "object" && object !== null;
	// &&
	// isWhereClause(obj.WHERE) && isOptionsClause(obj.OPTIONS);
}
