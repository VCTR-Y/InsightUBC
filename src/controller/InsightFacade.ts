import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets = new Map<string, InsightDataset>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		if (id === null || id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid Dataset ID");
		}

		if (this.datasets.has(id)) {
			throw new InsightError("Dataset Already Exists");
		}

		if (content === null || content.trim().length === 0) {
			throw new InsightError("Invalid Content");
		}

		if (!this.isBase64(content)) {
			throw new InsightError("Content is not in Base64");
		}

		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid Dataset Kind");
		}

		const zip = new JSZip();
		const data = await zip.loadAsync(content, { base64: true });
		const courses = data.folder("courses");

		if (!courses) {
			throw new InsightError("No Courses Folder");
		}

		let numRows = 0;
		const sections = [];

		const promises = Object.entries(courses.files)
			.filter(([relativePath]) => relativePath.endsWith(".json"))
			.map(async ([relativePath, file]) => {
				const fileData = await file.async("string");
				const parseData = JSON.parse(fileData);

				if (parseData && Array.isArray(parseData.result) && parseData.result.length > 0) {
					sections.push(...parseData.result);
					return parseData.result.length;
				} else {
					throw new InsightError("Invalid JSON");
				}
			});

		await Promise.all(promises);
		console.log(promises);

		numRows = sections.length;

		const dataset: InsightDataset = {
			id,
			kind,
			numRows,
		};

		this.datasets.set(id, dataset);

		return Array.from(this.datasets.keys());
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
