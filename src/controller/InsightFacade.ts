import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	selectAndOrder,
	ResultTooLargeError,
	Section,
	WhereObject,
	isQuery,
	handleIS,
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
		const directory = path.resolve(__dirname, "../../data/datasets");
		const filePath = path.join(directory, `datasets.json`);
		const fileExists = await fs.pathExists(filePath);

		if (fileExists && this.datasets.size === 0) {
			await this.loadFromDisk(filePath);
		}

		const valid = await this.checkValidDataset(id, content, kind);

		if (!valid) {
			throw new InsightError("Invalid id/content/kind");
		}

		const sections: any[] = await this.getSectionsFromContent(content);

		if (sections.length === 0) {
			throw new InsightError("no valid sections");
		}

		const dataset: InsightDataset = {
			id,
			kind,
			numRows: sections.length,
		};

		this.datasets.set(id, dataset);

		await this.addDatasetToDisk(id, sections);

		return Array.from(this.datasets.keys());
	}

	private async checkValidDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Boolean> {
		if (id === null || id.includes("_") || id.trim().length === 0) {
			return false;
		}

		if (this.datasets.has(id)) {
			return false;
		}

		if (content === null || content.trim().length === 0) {
			return false;
		}

		const isValidZip = await this.isValidBase64Zip(content);
		if (!isValidZip) {
			return false;
		}

		if (kind === null) {
			return false;
		}

		return kind === InsightDatasetKind.Sections;
	}

	private async getSectionsFromContent(content: string): Promise<any[]> {
		const zip = new JSZip();
		const data = await zip.loadAsync(content, { base64: true });
		const courses = Object.keys(data.files);

		if (!courses.includes("courses/")) {
			throw new InsightError("courses Folder Not Found");
		}

		const coursesFolder = zip.folder("courses");
		if (!coursesFolder || Object.keys(coursesFolder.files).length === 1) {
			throw new InsightError("courses folder not found or no files found");
		}

		const sections: any[] = [];

		await Promise.all(
			Object.entries(coursesFolder.files).map(async ([_relativePath, file]) => {
				try {
					const fileData = await file.async("string");
					if (!fileData) {
						return;
					}

					const { result, rank } = JSON.parse(fileData);
					if (!result || rank === undefined) {
						throw new InsightError("result/rank key not found");
					}

					const datasetMapped = this.renameKeys(result);

					sections.push(...datasetMapped);
				} catch {
					throw new InsightError("Invalid JSON");
				}
			})
		);

		return sections;
	}

	private renameKeys(sections: any[]): any[] {
		const def = 1900;
		const requiredFields = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];
		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			if (!requiredFields.every((field) => section[field] !== undefined && section[field] !== null)) {
				sections.splice(i, 1);
			}
		}

		return sections.map((item: any) => ({
			uuid: item.id,
			id: item.Course,
			title: item.Title,
			instructor: item.Professor,
			dept: item.Subject,
			year: item.Section === "overall" ? def : Number(item.Year),
			avg: item.Avg,
			pass: item.Pass,
			fail: item.Fail,
			audit: item.Audit,
		}));
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
			await fs.outputJSON(filePath, sections, { spaces: 2 });
		} catch (_err) {
			throw new InsightError("Failed to write dataset to disk");
		}
		await this.addDatasetsMapToDisk();
	}

	private async addDatasetsMapToDisk(): Promise<void> {
		const directory = path.resolve(__dirname, "../../data/datasets");
		fs.mkdir(directory, { recursive: true }, (err: any) => {
			if (err) {
				throw new InsightError("Something went wrong creating the directory");
			}
		});

		const filePath = path.join(directory, `datasets.json`);
		const datasetsArray = Array.from(this.datasets.entries()).map(([_key, value]) => ({
			id: value.id,
			kind: value.kind,
			numRows: value.numRows,
		}));

		try {
			await fs.outputJSON(filePath, datasetsArray, { spaces: 2 });
		} catch (_err) {
			throw new InsightError("Failed to write dataset to disk");
		}
	}

	private async isValidBase64Zip(str: string): Promise<Boolean> {
		const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
		if (!base64Regex.test(str)) {
			return false;
		}

		try {
			const zip = new JSZip();
			await zip.loadAsync(str, { base64: true });
			return true;
		} catch (_err) {
			return false;
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (id === null || id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid Dataset ID");
		}

		const directory = path.resolve(__dirname, "../../data");
		const datasetsDir = path.resolve(__dirname, "../../data/datasets");
		const filePath = path.join(directory, `${id}.json`);
		const datasetsPath = path.join(datasetsDir, "datasets.json");

		const fileExists = await fs.pathExists(filePath);

		if (fileExists && this.datasets.size === 0) {
			await this.loadFromDisk(datasetsPath);
		}

		if (!this.datasets.has(id)) {
			throw new NotFoundError("Dataset ID Not Found");
		}

		try {
			await fs.remove(filePath);
		} catch (_err) {
			throw new InsightError("Couldn't remove dataset from disk");
		}
		try {
			const datasetsList: InsightDataset[] = await fs.readJSON(datasetsPath);
			const updatedDatasetsList = datasetsList.filter((dataset) => {
				return dataset.id !== id;
			});
			await fs.writeJSON(datasetsPath, updatedDatasetsList, { spaces: 2 });
		} catch (_err) {
			throw new InsightError("Couldn't update datasets.json");
		}
		this.datasets.delete(id);

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		if (isQuery(query)) {
			const options = query.OPTIONS;
			const where = query.WHERE;
			if (options.COLUMNS.length === 0) {
				throw new InsightError("COLUMNS must be a non-empty array");
			}

			const datasetName = options.COLUMNS[0].split("_")[0];
			try {
				const data = await fs.readFile(`data/${datasetName}.json`, "utf-8");
				const dataset: Section[] = JSON.parse(data);

				const filteredData = filterData(dataset, where, datasetName);
				const maxResults = 5000;
				if (filteredData.length > maxResults) {
					throw new ResultTooLargeError();
				}
				return selectAndOrder(filteredData, query);
			} catch (err) {
				// console.log(err);
				if (err instanceof ResultTooLargeError) {
					throw new ResultTooLargeError("Too many results");
				}
				throw new InsightError("dataset not found");
			}
		} else {
			throw new InsightError("Invalid JSON");
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const directory = path.resolve(__dirname, "../../data/datasets/");
		const filePath = path.join(directory, "datasets.json");
		const fileExists = await fs.pathExists(filePath);

		if (fileExists) {
			if (this.datasets.size === 0) {
				await this.loadFromDisk(filePath);
			}
		} else {
			return [];
		}

		let dataset: InsightDataset[];

		try {
			dataset = await fs.readJSON(filePath);
			return dataset;
		} catch (_err) {
			throw new InsightError("Something went wrong listing datasets");
		}
	}

	private async loadFromDisk(filePath: string): Promise<void> {
		const datasetsArray = await fs.readJSON(filePath);
		datasetsArray.forEach((dataset: InsightDataset) => {
			this.datasets.set(dataset.id, {
				id: dataset.id,
				kind: dataset.kind,
				numRows: dataset.numRows,
			});
		});
	}
}

function filterData(dataset: any[], where: WhereObject, datasetName: string): any[] {
	return dataset.filter((row) => {
		return parseWhereObject(row, where, datasetName);
	});
}

function parseWhereObject(row: any, where: WhereObject, datasetName: string): boolean {
	if ("IS" in where) {
		return handleIS(row, where, datasetName);
	} else if ("GT" in where) {
		const [mkey, value] = Object.entries(where.GT!)[0];
		if (mkey.split("_")[0] !== datasetName) {
			throw new InsightError("wrong dataset");
		}
		const key = mkey.split("_")[1];
		return row[key] > value;
	} else if ("LT" in where) {
		const [mkey, value] = Object.entries(where.LT!)[0];
		if (mkey.split("_")[0] !== datasetName) {
			throw new InsightError("wrong dataset");
		}
		const key = mkey.split("_")[1];
		return row[key] < value;
	} else if ("EQ" in where) {
		const [mkey, value] = Object.entries(where.EQ!)[0];
		if (mkey.split("_")[0] !== datasetName) {
			throw new InsightError("wrong dataset");
		}
		const key = mkey.split("_")[1];
		return row[key] === value;
	} else if ("AND" in where) {
		return where.AND!.every((child) => parseWhereObject(row, child, datasetName));
	} else if ("OR" in where) {
		return where.OR!.some((child) => parseWhereObject(row, child, datasetName));
	} else if ("NOT" in where) {
		return !parseWhereObject(row, where.NOT!, datasetName);
	}
	return true;
}
