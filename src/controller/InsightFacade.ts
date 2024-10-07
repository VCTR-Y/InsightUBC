import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";
import fs from "fs-extra";
import path from "node:path";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets = new Map<string, InsightDataset>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		const valid = await this.checkValidDataset(id, content, kind);

		if (!valid) {
			throw new InsightError("Invalid id/content/kind");
		}

		const sections: any[] = await this.getSectionsFromContent(content);
		const numRows = sections.length;

		const dataset: InsightDataset = {
			id,
			kind,
			numRows,
		};

		this.datasets.set(id, dataset);

		await this.addDatasetToDisk(id, sections);

		return Array.from(this.datasets.keys());
	}

	private async checkValidDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Boolean> {
		if (id === null || id.includes("_") || id.trim().length === 0) {
			// throw new InsightError("Invalid Dataset ID");
			return false;
		}

		if (this.datasets.has(id)) {
			// throw new InsightError("Dataset Already Exists");
			return false;
		}

		if (content === null || content.trim().length === 0) {
			// throw new InsightError("Invalid Content");
			return false;
		}

		if (!this.isBase64(content)) {
			// throw new InsightError("Content is not in Base64");
			return false;
		}

		if (kind !== InsightDatasetKind.Sections) {
			// throw new InsightError("Invalid Dataset Kind");
			return false;
		}

		return true;
	}

	private async getSectionsFromContent(content: string): Promise<any[]> {
		const zip = new JSZip();
		const data = await zip.loadAsync(content, { base64: true });
		const courses = Object.keys(data.files);
		const sections: any[] = [];

		if (courses[0] !== "courses/") {
			throw new InsightError("courses Folder Not Found");
		}

		const coursesFolder = zip.folder("courses");

		if (!coursesFolder || Object.keys(coursesFolder.files).length === 1) {
			throw new InsightError("courses folder not found or no files found");
		}

		const promises = Object.entries(coursesFolder.files).map(async ([_relativePath, file]) => {
			try {
				const fileData = await file.async("string");
				if (!fileData) {
					return;
				}
				const parsedData = JSON.parse(fileData);

				if (!parsedData.result || parsedData.rank === undefined) {
					throw new InsightError("result/rank key not found");
				}
				if (parsedData && Array.isArray(parsedData.result) && parsedData.result.length > 0) {
					sections.push(...parsedData.result);
					return parsedData.result.length;
				}
			} catch (_err) {
				throw new InsightError("Invalid JSON");
			}
		});

		await Promise.all(promises);
		return sections;
	}

	private async addDatasetToDisk(id: string, sections: any[]): Promise<void> {
		const directory = path.resolve(__dirname, "../../data");
		fs.mkdir(directory, { recursive: true }, (err: any) => {
			if (err) {
				throw new InsightError("Something went wrong creating the directory");
			}
		});

		const filePath = path.join(directory, `${id}.json`);
		try {
			await fs.outputJSON(filePath, sections);
		} catch (_err) {
			throw new InsightError("Failed to write dataset to disk");
		}
	}

	private isBase64(str: string): boolean {
		const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
		return base64Regex.test(str);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		if (id === null || id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid Dataset ID");
		}

		if (!this.datasets.has(id)) {
			throw new NotFoundError("Dataset ID Not Found");
		}

		const directory = path.resolve(__dirname, "../../data");
		const filePath = path.join(directory, `${id}.json`);

		try {
			await fs.remove(filePath);
		} catch (_err) {
			throw new InsightError("Couldn't remove dataset from disk");
		}

		this.datasets.delete(id);
		return id;
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
		const list: InsightDataset[] = [];

		this.datasets.forEach((dataset) => {
			list.push({
				id: dataset.id,
				kind: dataset.kind,
				numRows: dataset.numRows,
			});
		});

		return list;
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
