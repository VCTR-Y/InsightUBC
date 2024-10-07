import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import * as fs from "fs-extra";

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
		console.log(query);
		if (isQuery(query)) {
			const options = query.OPTIONS;
			const where = query.WHERE;
			if (options.COLUMNS.length === 0) {
				throw new InsightError("COLUMNS must be a non-empty array");
			}

			const datasetName = options.COLUMNS[0].split("_")[0];
			try {
				const data = await fs.readFile(`_data/${datasetName}.json`, "utf-8");
				const dataset: Section[] = JSON.parse(data);

				// console.log(dataset);

				const output = filterData(dataset, where);

				console.log(output);
			} catch (err) {
				console.log(err);
				throw new InsightError("dataset not found");
			}
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

interface Section {
	title: string;
	uuid: string;
	instructor: string;
	audit: number;
	year: number;
	id: string;
	pass: number;
	fail: number;
	avg: number;
	dept: string;
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
	return (
		typeof object === "object" && object !== null && isWhereObject(object.WHERE) && isOptionsObject(object.OPTIONS)
	);
}

function isWhereObject(object: any): object is WhereObject {
	return isFilterObject(object);
}

function isOptionsObject(object: any): object is OptionsObject {
	return (
		typeof object === "object" &&
		object !== null &&
		Array.isArray(object.COLUMNS) &&
		(typeof object.ORDER === "string" || object.ORDER === undefined)
	);
}

function isFilterObject(object: any): object is FILTER {
	return isSCOMPARATOR(object) || isMCOMPARATOR(object) || isLOGICCOMPARATOR(object);
}

function isSCOMPARATOR(object: any): object is SCOMPARATOR {
	return typeof object === "object" && object !== null && object.IS !== undefined;
}

function isMCOMPARATOR(object: any): object is SCOMPARATOR {
	return (
		typeof object === "object" &&
		object !== null &&
		(object.GT !== undefined || object.LT !== undefined || object.EQ !== undefined)
	);
}

function isLOGICCOMPARATOR(object: any): object is SCOMPARATOR {
	return (
		typeof object === "object" &&
		object !== null &&
		(object.AND !== undefined || object.OR !== undefined || object.NOT !== undefined)
	);
}

function filterData(dataset: any[], where: WhereObject): any[] {
	return dataset.filter((row) => {
		return parseWhereObject(row, where);
	});
}

function parseWhereObject(row: any, where: WhereObject): boolean {
	if ("IS" in where) {
		console.log(Object.entries(where.IS!)[0]);
		const [skey, value] = Object.entries(where.IS!)[0];
		const key = skey.split("_")[1];
		return row[key].equals(value);
	} else if ("GT" in where) {
		console.log(Object.entries(where.GT!)[0]);
		const [mkey, value] = Object.entries(where.GT!)[0];
		const key = mkey.split("_")[1];
		return row[key] > value;
	}

	return true;
}
