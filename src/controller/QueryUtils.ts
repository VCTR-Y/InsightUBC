import { InsightError } from "./IInsightFacade";

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
