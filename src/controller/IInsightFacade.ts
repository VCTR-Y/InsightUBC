/*
 * This is the primary high-level API for the project. In this folder there should be:
 * A class called InsightFacade, this should be in a file called InsightFacade.ts.
 * You should not change this interface at all or the test suite will not work.
 */

export enum InsightDatasetKind {
	Sections = "sections",
	Rooms = "rooms",
}

export interface InsightDataset {
	id: string;
	kind: InsightDatasetKind;
	numRows: number;
}

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export interface Section {
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

export interface MCOMPARATOR {
	GT?: Record<string, number>;
	LT?: Record<string, number>;
	EQ?: Record<string, number>;
}

export interface SCOMPARATOR {
	IS?: Record<string, string>;
}

export type FILTER = SCOMPARATOR | MCOMPARATOR | LOGICCOMPARATOR;

export interface LOGICCOMPARATOR {
	AND?: FILTER[];
	OR?: FILTER[];
	NOT?: FILTER;
}

export type WhereObject = FILTER;

export interface OptionsObject {
	COLUMNS: string[];
	ORDER?: string;
}

export interface QueryObject {
	WHERE: WhereObject;
	OPTIONS: OptionsObject;
}

export type InsightResult = Record<string, string | number>;

export class InsightError extends Error {
	constructor(message?: string) {
		super(message);
		Error.captureStackTrace(this, InsightError);
	}
}

export class NotFoundError extends Error {
	constructor(message?: string) {
		super(message);
		Error.captureStackTrace(this, NotFoundError);
	}
}

export class ResultTooLargeError extends Error {
	constructor(message?: string) {
		super(message);
		Error.captureStackTrace(this, ResultTooLargeError);
	}
}

export function isQuery(object: any): object is QueryObject {
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
		(typeof object.ORDER === "string" || object.ORDER === undefined) &&
		Object.keys(object).every((key) => key === "COLUMNS" || key === "ORDER")
	);
}

export function isFilterObject(object: any): object is FILTER {
	if (isSCOMPARATOR(object) || isMCOMPARATOR(object) || isLOGICCOMPARATOR(object)) {
		return Object.keys(object).length === 1;
	}
	return false;
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

export const mfield = ["avg", "pass", "fail", "audit", "year"];
export const sfield = ["dept", "id", "instructor", "title", "uuid"];

let keys: any[] = [];
keys = keys.concat(mfield, sfield);

export function selectAndOrder(filteredData: any[], query: QueryObject): any[] {
	const selectedData = filteredData.map((row) => {
		const selectedRow: any = {};

		query.OPTIONS.COLUMNS.forEach((column) => {
			const oldColumn = column.split("_")[1];
			if (!keys.includes(oldColumn)) {
				throw new InsightError("Invalid key");
			}
			selectedRow[column] = row[oldColumn];
		});

		return selectedRow;
	});

	if (query.OPTIONS.ORDER) {
		if (!keys.includes(query.OPTIONS.ORDER.split("_")[1])) {
			throw new InsightError("Invalid key");
		}
		if (!query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER)) {
			throw new InsightError("ORDER not in COLUMNS");
		}
		selectedData.sort((a, b) => {
			const orderKey = query.OPTIONS.ORDER!;
			return a[orderKey] > b[orderKey] ? 1 : -1;
		});
	}
	return selectedData;
}

export function handleIS(row: any, where: WhereObject, datasetName: string): boolean {
	if ("IS" in where) {
		const [skey, value] = Object.entries(where.IS!)[0];

		if (skey.split("_")[0] !== datasetName) {
			throw new InsightError("wrong dataset");
		}
		const key = skey.split("_")[1];

		if (!sfield.includes(key)) {
			throw new InsightError("wrong key");
		}

		const startsWithWildcard = value.startsWith("*");
		const endsWithWildcard = value.endsWith("*");

		const middleAsterisk = value.indexOf("*");
		if (middleAsterisk > 0 && middleAsterisk < value.length - 1) {
			throw new InsightError("Middle asterisk");
		}

		// const cleanValue = value.replaceAll("*", "");
		const cleanValue = value.replace(/^\*|\*$/g, "");

		if (startsWithWildcard && endsWithWildcard) {
			return row[key].includes(cleanValue);
		} else if (startsWithWildcard) {
			return row[key].endsWith(cleanValue);
		} else if (endsWithWildcard) {
			return row[key].startsWith(cleanValue);
		} else {
			return row[key] === cleanValue;
		}
	}
	return true;
}

export function handleMCOMPARATOR(row: any, where: WhereObject, datasetName: string): boolean {
	let mkey = "";
	let value: any;
	let type = "GT";
	if ("GT" in where) {
		[mkey, value] = Object.entries(where.GT!)[0];
	} else if ("LT" in where) {
		type = "LT";
		[mkey, value] = Object.entries(where.LT!)[0];
	} else if ("EQ" in where) {
		type = "EQ";
		[mkey, value] = Object.entries(where.EQ!)[0];
	}
	if (mkey.split("_")[0] !== datasetName) {
		throw new InsightError("wrong dataset");
	}
	if (!mfield.includes(mkey.split("_")[1])) {
		throw new InsightError("invalid key");
	}
	const key = mkey.split("_")[1];
	return type === "GT" ? row[key] > value : type === "LT" ? row[key] < value : row[key] === value;
}

export interface IInsightFacade {
	/**
	 * Add a dataset to insightUBC.
	 *
	 * @param id  The id of the dataset being added. Follows the format /^[^_]+$/
	 * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
	 * @param kind  The kind of the dataset
	 *
	 * @return Promise <string[]>
	 *
	 * The promise should fulfill on a successful add, reject for any failures.
	 * The promise should fulfill with a string array,
	 * containing the ids of all currently added datasets upon a successful add.
	 * The promise should reject with an InsightError describing the error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
	 *
	 * After receiving the dataset, it should be processed into a data structure of
	 * your design. The processed data structure should be persisted to disk; your
	 * system should be able to load this persisted value into memory for answering
	 * queries.
	 *
	 * Ultimately, a dataset must be added or loaded from disk before queries can
	 * be successfully answered.
	 */
	addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]>;

	/**
	 * Remove a dataset from insightUBC.
	 *
	 * @param id  The id of the dataset to remove. Follows the format /^[^_]+$/
	 *
	 * @return Promise <string>
	 *
	 * The promise should fulfill upon a successful removal, reject on any error.
	 * Attempting to remove a dataset that hasn't been added yet counts as an error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 *
	 * The promise should fulfill the id of the dataset that was removed.
	 * The promise should reject with a NotFoundError (if a valid id was not yet added)
	 * or an InsightError (invalid id or any other source of failure) describing the error.
	 *
	 * This will delete both disk and memory caches for the dataset for the id meaning
	 * that subsequent queries for that id should fail unless a new addDataset happens first.
	 */
	removeDataset(id: string): Promise<string>;

	/**
	 * Perform a query on insightUBC.
	 *
	 * @param query  The query to be performed.
	 *
	 * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
	 * or references multiple datasets, it should be rejected.
	 *
	 * @return Promise <InsightResult[]>
	 *
	 * The promise should fulfill with an array of results.
	 * The promise should reject with a ResultTooLargeError (if the query returns too many results)
	 * or an InsightError (for any other source of failure) describing the error.
	 */
	performQuery(query: unknown): Promise<InsightResult[]>;

	/**
	 * List all currently added datasets, their types, and number of rows.
	 *
	 * @return Promise <InsightDataset[]>
	 * The promise should fulfill an array of currently added InsightDatasets, and will only fulfill.
	 */
	listDatasets(): Promise<InsightDataset[]>;
}
