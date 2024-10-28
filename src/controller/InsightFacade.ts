import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import { selectAndOrder, WhereObject, isQuery, handleIS, handleMCOMPARATOR, isFilterObject } from "./QueryUtils";
import fs from "fs-extra";
import path from "node:path";
import { clearDisk } from "../../test/TestUtil";
import {
	checkValidDataset,
	getSectionsFromContent,
	addDatasetToDisk,
	addDatasetsMapToDisk,
	loadFromDisk,
} from "./DatasetUtils";

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
			await loadFromDisk(filePath, this.datasets);
		}

		const valid = await checkValidDataset(id, content, kind, this.datasets);

		if (!valid) {
			throw new InsightError("Invalid id/content/kind");
		}

		const sections: any[] = await getSectionsFromContent(content);

		if (sections.length === 0) {
			throw new InsightError("no valid sections");
		}

		const dataset: InsightDataset = {
			id,
			kind,
			numRows: sections.length,
		};

		await addDatasetToDisk(id, sections);

		await addDatasetsMapToDisk(id, dataset, this.datasets);

		return Array.from(this.datasets.keys());
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
			await loadFromDisk(datasetsPath, this.datasets);
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

		if (this.datasets.size === 0) {
			await clearDisk();
		}

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
				const dataset = await fs.readJSON(`data/${datasetName}.json`);

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
				await loadFromDisk(filePath, this.datasets);
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
}

function filterData(dataset: any[], where: WhereObject, datasetName: string): any[] {
	return dataset.filter((row) => {
		return parseWhereObject(row, where, datasetName);
	});
}

function parseWhereObject(row: any, where: WhereObject, datasetName: string): boolean {
	if (!isFilterObject(where)) {
		throw new InsightError("Invalid object");
	}
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
	throw new InsightError("Invalid object");
}
