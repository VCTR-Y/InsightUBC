import { InsightError } from "./IInsightFacade";
import Decimal from "decimal.js";

export const mfield = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
export const sfield = [
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];

// let keys: any[] = [];
// keys = keys.concat(mfield, sfield);

export const applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

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
	ORDER?: string | OrderObject;
}

export interface QueryObject {
	WHERE: WhereObject;
	OPTIONS: OptionsObject;
	TRANSFORMATIONS: TransformationsObject;
}

export interface TransformationsObject {
	GROUP: string[];
	APPLY: ApplyRule[];
}

export type ApplyRule = Record<
	string,
	{
		[applyToken in "MAX" | "MIN" | "AVG" | "COUNT" | "SUM"]: string;
	}
>;

export interface OrderObject {
	dir: string;
	keys: string[];
}

export function isQuery(object: any): object is QueryObject {
	if (
		typeof object !== "object" ||
		object === null ||
		!isWhereObject(object.WHERE) ||
		!isOptionsObject(object.OPTIONS)
	) {
		return false;
	}

	const hasTransformations = "TRANSFORMATIONS" in object;

	const validTransformations = !hasTransformations || isTransformationsObject(object.TRANSFORMATIONS);
	const validKeys = Object.keys(object).every(
		(key) => key === "WHERE" || key === "OPTIONS" || key === "TRANSFORMATIONS"
	);

	return validTransformations && validKeys;
}

function isWhereObject(object: any): object is WhereObject {
	return isFilterObject(object) || Object.keys(object).length === 0;
}

function isOptionsObject(object: any): object is OptionsObject {
	return (
		typeof object === "object" &&
		object !== null &&
		Array.isArray(object.COLUMNS) &&
		(typeof object.ORDER === "string" || object.ORDER === undefined || isOrderObject(object.ORDER)) &&
		Object.keys(object).every((key) => key === "COLUMNS" || key === "ORDER")
	);
}

function isOrderObject(object: any): object is OrderObject {
	return (
		typeof object === "object" &&
		object !== null &&
		typeof object.dir === "string" &&
		(object.dir === "UP" || object.dir === "DOWN")
	);
}

function isTransformationsObject(object: any): object is TransformationsObject {
	return typeof object === "object" && object !== null && object;
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

export function filterData(dataset: any[], where: WhereObject, datasetName: string): any[] {
	return dataset.filter((row) => {
		return parseWhereObject(row, where, datasetName);
	});
}

export function parseWhereObject(row: any, where: WhereObject, datasetName: string): boolean {
	// if (!isFilterObject(where)) {
	// 	throw new InsightError("Invalid object");
	// }
	if ("IS" in where) {
		return handleIS(row, where, datasetName);
	} else if ("GT" in where) {
		return handleMCOMPARATOR(row, where, datasetName);
	} else if ("LT" in where) {
		return handleMCOMPARATOR(row, where, datasetName);
	} else if ("EQ" in where) {
		return handleMCOMPARATOR(row, where, datasetName);
	} else if ("AND" in where) {
		if (where.AND!.length === 0) {
			throw new InsightError("AND can't be empty");
		}
		return where.AND!.every((child) => parseWhereObject(row, child, datasetName));
	} else if ("OR" in where) {
		if (where.OR!.length === 0) {
			throw new InsightError("OR can't be empty");
		}
		return where.OR!.some((child) => parseWhereObject(row, child, datasetName));
	} else if ("NOT" in where) {
		return !parseWhereObject(row, where.NOT!, datasetName);
	}
	// throw new InsightError("Invalid object");
	return true;
}

export function selectAndOrder(filteredData: any[], query: QueryObject): any[] {
	const selectedData = filteredData.map((row) => {
		const selectedRow: any = {};

		query.OPTIONS.COLUMNS.forEach((column) => {
			// console.log(row);
			// console.log(column);
			// const oldColumn = column.split("_")[1];
			// if (!keys.includes(oldColumn)) {
			// 	throw new InsightError("Invalid key");
			// }
			selectedRow[column] = row[column];
		});

		return selectedRow;
	});

	return sort(selectedData, query);
}

export function sort(selectedData: any[], query: QueryObject): any[] {
	if (query.OPTIONS.ORDER) {
		const order = query.OPTIONS.ORDER;

		if (typeof order === "string") {
			if (!query.OPTIONS.COLUMNS.includes(order)) {
				throw new InsightError("ORDER not in COLUMNS");
			}
			selectedData.sort((a, b) => {
				return a[order] > b[order] ? 1 : -1;
			});
		} else if (typeof order === "object" && order !== null) {
			const { dir, keys: orderKeys } = order;

			if (!orderKeys.every((key) => query.OPTIONS.COLUMNS.includes(key))) {
				throw new InsightError("ORDER keys must be in COLUMNS");
			}

			selectedData.sort((a, b) => {
				for (const key of orderKeys) {
					if (a[key] > b[key]) {
						return dir === "UP" ? 1 : -1;
					}
					if (a[key] < b[key]) {
						return dir === "UP" ? -1 : 1;
					}
				}
				return 0;
			});
		} else {
			throw new InsightError("Invalid ORDER format");
		}
	}
	return selectedData;
}

type Row = Record<string, any>;

export function groupAndApply(data: Row[], query: QueryObject): Row[] {
	const groupKeys = query.TRANSFORMATIONS.GROUP;
	const applyRules = query.TRANSFORMATIONS.APPLY;

	const groupedData = groupData(data, groupKeys);

	return Array.from(groupedData.values()).map((group) => {
		const result: Row = {};

		groupKeys.forEach((key) => (result[key] = group[0][key.split("_")[1]]));

		applyRules.forEach((rule) => {
			const [applyKey, applyObj] = Object.entries(rule)[0];
			const [token, field] = Object.entries(applyObj)[0];
			result[applyKey] = applyRule(token, group, field);
		});
		return result;
	});
}

export function groupData(data: Row[], groupKeys: string[]): Map<string, Row[]> {
	const map = new Map<string, Row[]>();
	// console.log(groupKeys);

	data.forEach((row) => {
		const key = groupKeys.map((k) => row[k.split("_")[1]]).join("_");
		if (!map.has(key)) {
			map.set(key, []);
		}
		if (!map.get(key)!.includes(row)) {
			map.get(key)!.push(row);
		}
	});
	return map;
}

export function applyRule(token: string, group: Row[], field: string): any {
	const values = group.map((row) => row[field.split("_")[1]]).filter((v) => v !== undefined);

	switch (token) {
		case "MAX":
			return Math.max(...values);
		case "MIN":
			return Math.min(...values);
		case "AVG":
			return calcAverage(values);
		case "COUNT":
			return new Set(values).size;
		case "SUM":
			return values.reduce((sum, val) => sum + val, 0);
		default:
			throw new InsightError("Invalid APPLY token");
	}
}

function calcAverage(values: number[]): number {
	const magicNumber = 2;

	const decValues = values.map((v) => new Decimal(v));
	const total = decValues.reduce((t, v) => Decimal.add(t, v), new Decimal(0));
	const numRows = values.length;
	const avg = total.toNumber() / numRows;
	return Number(avg.toFixed(magicNumber));
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
