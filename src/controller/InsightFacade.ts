import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import { selectAndOrder, isQuery, filterData, getDatasetName } from "./QueryUtils";
import { groupAndApply } from "./QueryFunctions";
import fs from "fs-extra";
import path from "node:path";

import {
	checkValidDataset,
	getSectionsFromContent,
	addDatasetToDisk,
	addDatasetsMapToDisk,
	loadFromDisk,
} from "./SectionDatasetUtils";
import { getRoomsFromContent } from "./RoomDatasetUtils";

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

		let data: any[];

		if (kind === InsightDatasetKind.Sections) {
			data = await getSectionsFromContent(content);
		} else if (kind === InsightDatasetKind.Rooms) {
			data = await getRoomsFromContent(content);
		} else {
			throw new InsightError("Invalid Kind");
		}

		if (data.length === 0) {
			throw new InsightError("no valid rooms/sections");
		}

		const dataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: data.length,
		};

		await addDatasetToDisk(id, data);

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
			this.datasets.delete(id);
		} catch (_err) {
			throw new InsightError("Couldn't update datasets.json");
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

			let datasetName = options.COLUMNS.find((col) => col.includes("_"))?.split("_")[0];

			if (datasetName === undefined) {
				datasetName = getDatasetName(query);
			}

			try {
				const dataset = await fs.readJSON(`data/${datasetName}.json`);

				const filteredData = filterData(dataset, where, datasetName);

				let transformedData = filteredData;

				if (query.TRANSFORMATIONS) {
					transformedData = groupAndApply(filteredData, query);
				}

				const selectedData = selectAndOrder(transformedData, query);
				const maxResults = 5000;
				if (selectedData.length > maxResults) {
					throw new ResultTooLargeError();
				}
				return selectedData;
			} catch (err) {
				//console.log(err);
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
