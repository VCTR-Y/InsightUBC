import { InsightError } from "./IInsightFacade";
import Decimal from "decimal.js";
import { QueryObject } from "./QueryUtils";

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