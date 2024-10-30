import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";
import JSZip from "jszip";
import fs from "fs-extra";
import path from "node:path";

export async function checkValidDataset(
	id: string,
	content: string,
	kind: InsightDatasetKind,
	datasets: Map<string, InsightDataset>
): Promise<boolean> {
	if (id === null || id.includes("_") || id.trim().length === 0) {
		return false;
	}

	if (datasets.has(id)) {
		return false;
	}

	if (content === null || content.trim().length === 0) {
		return false;
	}

	const isValidZip = await isValidBase64Zip(content);
	if (!isValidZip) {
		return false;
	}

	return kind === InsightDatasetKind.Sections || kind === InsightDatasetKind.Rooms;
}

export async function isValidBase64Zip(str: string): Promise<boolean> {
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

export async function getSectionsFromContent(content: string): Promise<any[]> {
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

				const datasetMapped = renameKeys(result);

				sections.push(...datasetMapped);
			} catch (_err) {
				throw new InsightError("Invalid JSON");
			}
		})
	);

	return sections;
}

export function renameKeys(sections: any[]): any[] {
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

export async function addDatasetToDisk(id: string, sections: any[]): Promise<void> {
	const directory = path.resolve(__dirname, "../../data");
	await fs.mkdir(directory, { recursive: true });

	const filePath = path.join(directory, `${id}.json`);

	try {
		await fs.outputJSON(filePath, sections, { spaces: 2 });
	} catch (_err) {
		throw new InsightError("Failed to write dataset to disk");
	}
}

export async function addDatasetsMapToDisk(
	id: string,
	dataset: InsightDataset,
	datasets: Map<string, InsightDataset>
): Promise<void> {
	const directory = path.resolve(__dirname, "../../data/datasets");
	await fs.mkdir(directory, { recursive: true });

	datasets.set(id, dataset);

	const filePath = path.join(directory, `datasets.json`);
	const datasetsArray = Array.from(datasets.entries()).map(([_key, value]) => ({
		id: value.id,
		kind: value.kind,
		numRows: value.numRows,
	}));

	try {
		await fs.outputJSON(filePath, datasetsArray, { spaces: 2 });
	} catch (_err) {
		datasets.delete(id);
		throw new InsightError("Failed to write dataset to disk");
	}
}

export async function loadFromDisk(filePath: string, datasets: Map<string, InsightDataset>): Promise<void> {
	const datasetsArray = await fs.readJSON(filePath);
	datasetsArray.forEach((dataset: InsightDataset) => {
		datasets.set(dataset.id, {
			id: dataset.id,
			kind: dataset.kind,
			numRows: dataset.numRows,
		});
	});
}
