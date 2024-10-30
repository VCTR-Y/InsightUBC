import { InsightError } from "./IInsightFacade";

export const mfield = ["avg", "pass", "fail", "audit", "year"];
export const sfield = ["dept", "id", "instructor", "title", "uuid"];

let keys: any[] = [];
keys = keys.concat(mfield, sfield);

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
	APPLY: string[];
}

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
	return isFilterObject(object);
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
