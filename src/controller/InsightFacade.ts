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
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
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
