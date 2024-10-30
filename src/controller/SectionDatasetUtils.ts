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

// export async function getRoomsFromContent(content: string): Promise<any[]> {
// 	const zip = new JSZip();
// 	const data = await zip.loadAsync(content, { base64: true });
// 	const parse5 = require('parse5');
// 	const indexFile = data.file("index.htm");
// 	const buildingsPath = "campus/discover/buildings-and-classrooms/";
// 	const rooms = Object.keys(data.files);
//
// 	if (!indexFile) {
// 		throw new InsightError("Index.htm file not found");
// 	}
// 	if (!rooms.includes(buildingsPath)) {
// 		throw new InsightError("buildings-and-classrooms folder not found");
// 	}
//
// 	const indexContent = await indexFile.async("text");
// 	const document = parse5.parse(indexContent);
// 	const buildingTable = findBuildingTable(document);
//
// 	if (!buildingTable) {
// 		throw new InsightError("No Valid Table");
// 	}
//
// 	const buildings = await parseBuildings(buildingTable)
// 	if (buildings.length === 0) {
// 		throw new InsightError("no valid buildings");
// 	}
//
// 	const allRooms: any[] = [];
// 	await Promise.all(buildings.map(async (building) => {
// 		const buildingFile = data.file(building.href);
// 		if (!buildingFile) {
// 			return;
// 		}
// 		const buildingContent = await buildingFile.async("text");
// 		const bDocument = parse5.parse(buildingContent);
// 		const roomTable = findRoomTable(bDocument);
// 		if (!roomTable) {
// 			return;
// 		}
// 		const result = parseRooms(bDocument, building);
// 		allRooms.push(...result);
// 	}))
//
// 	console.log(allRooms)
//
// 	{return allRooms;}
// }
//
// function findBuildingTable(document: string): any {
// 	const tables = findNodesByTag(document, "table");
// 	for (const table of tables) {
// 		if (containsValidBuildingData(table)) {
// 			return table;
// 		}
// 	}
// 	return null;
// }
//
// // IDK IF THIS IMPLEMENTATION IS RIGHT/CORRECT (Checks if there is AT LEAST ONE VALID ROOM)
// function containsValidBuildingData(table: any): boolean {
// 	const cells = findNodesByTag(table, "td");
//
// 	let hasTitle = false;
// 	let hasAddress = false;
//
// 	for (const cell of cells) {
// 		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
// 		if (classAttr) {
// 			const cellClasses = classAttr.value.split(" ");
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-title")) {
// 				hasTitle = true;
// 			}
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-building-address")) {
// 				hasAddress = true;
// 			}
// 		}
// 	}
//
// 	return hasTitle && hasAddress;
// }
//
// function findRoomTable(document: string): any {
// 	const tables = findNodesByTag(document, "table");
// 	for (const table of tables) {
// 		if (containsValidRoomData(table)) {
// 			return table;
// 		}
// 	}
// 	return null;
// }
//
// function containsValidRoomData(table: any): boolean {
// 	const cells = findNodesByTag(table, "th");
//
// 	let hasRoom = false;
// 	let hasCapacity = false;
// 	let hasFurniture = false;
// 	let hasType = false;
//
// 	for (const cell of cells) {
// 		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
// 		if (classAttr) {
// 			const cellClasses = classAttr.value.split(" ");
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-number")) {
// 				hasRoom = true;
// 			}
// 			// console.log("room" + ": " + hasRoom)
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-capacity")) {
// 				hasCapacity = true;
// 			}
// 			// console.log("capa" + ": " + hasCapacity)
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-furniture")) {
// 				hasFurniture = true;
// 			}
// 			// console.log("furn" + ": " + hasFurniture)
// 			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-type")) {
// 				hasType = true;
// 			}
// 			// console.log("type" + ": " + hasType);
// 		}
//
// 	}
// 	return hasRoom && hasCapacity && hasFurniture && hasType;
// }
//
// function findNodesByTag(node: any, tagName: string): any[] {
// 	const nodes: any[] = [];
//
// 	if (node.tagName === tagName) {
// 		nodes.push(node);
// 	}
//
// 	if (node.childNodes && Array.isArray(node.childNodes)) {
// 		for (const child of node.childNodes) {
// 			nodes.push(...findNodesByTag(child, tagName));
// 		}
// 	}
//
// 	return nodes;
// }
//
// // This function was written with the assistance of and partly generated by ChatGPT
// async function parseBuildings(buildingTable: any): Promise<any[]> {
// 	const rows = findNodesByTag(buildingTable, "tr");
//
// 	const buildings = await Promise.all(rows.map(async (row) => parseBuildingRow(row)));
//
// 	return buildings.filter(building => building !== null);
// }
//
// // Parse an individual row for building details
// async function parseBuildingRow(row: any): Promise<any | null> {
// 	const titleCell = findCellByClass(row, "views-field-title");
// 	const addressCell = findCellByClass(row, "views-field-field-building-address");
//
// 	if (titleCell && addressCell) {
// 		const fullname = getTextContent(titleCell);
// 		const link = findNodesByTag(titleCell, "a")[0];
// 		const shortname = getShortnameFromLink(link);
// 		const href = link ? link.attrs.find((attr: any) => attr.name === "href")?.value.replace("./", "") : null;
// 		const address = getTextContent(addressCell);
//
// 		const { lat, lon } = await fetchGeolocation(address);
//
// 		return {
// 			fullname,
// 			shortname,
// 			address,
// 			lat,
// 			lon,
// 			href,
// 		};
// 	}
// 	return null;
// }
//
// // Helper to get a specific cell by class
// function findCellByClass(row: any, className: string): any | null {
// 	return findNodesByTag(row, "td").find(cell => {
// 		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
// 		return classAttr?.value.split(" ").includes(className);
// 	});
// }
//
// // Helper to extract text content, stripping out HTML tags
// function getTextContent(cell: any): string {
// 	return require('parse5').serialize(cell).replace(/(<([^>]+)>)/gi, "").trim();
// }
//
// // Helper to extract shortname from a link's href attribute
// function getShortnameFromLink(link: any): string | null {
// 	const hrefAttr = link?.attrs?.find((attr: any) => attr.name === "href");
// 	return hrefAttr ? hrefAttr.value.split("/").pop()?.split(".")[0] : null;
// }
// // End of AI-generated code
//
// // These functions were written with the assistance of and partly generated by ChatGPT
// function parseRooms(html: string, building: any): any[] {
// 	const rows = findNodesByTag(html, "tr");
// 	return rows.map(row => parseRoomRow(row, building)).filter(room => room !== null);
// }
//
// // Parses individual row for room details
// function parseRoomRow(row: any, building: any): any | null {
// 	const number = getCellContent(row, "views-field-field-room-number");
// 	const seats = getCellContent(row, "views-field-field-room-capacity");
// 	const furniture = getCellContent(row, "views-field-field-room-furniture");
// 	const type = getCellContent(row, "views-field-field-room-type");
//
// 	if (number && seats && furniture && type) {
// 		return {
// 			...building,
// 			number: number.trim(),
// 			seats: Number(seats.trim()),
// 			furniture: furniture.trim(),
// 			type: type.trim(),
// 		};
// 	}
// 	return null;
// }
//
// // Helper function to get content of a cell by class name
// function getCellContent(row: any, className: string): string | null {
// 	const parse5 = require('parse5');
// 	const cell = findNodesByTag(row, "td").find(cel => {
// 		const classAttr = cel.attrs?.find((attr: any) => attr.name === "class");
// 		return classAttr?.value.includes(className);
// 	});
// 	return cell ? parse5.serialize(cell).replace(/(<([^>]+)>)/gi, "") : null;
// }
// // End of AI-generated code
//
// // This function was generated by CHATGPT
// async function fetchGeolocation(address: string): Promise<GeoResponse> {
// 	return new Promise((resolve) => {
// 		const encodedAddress = encodeURIComponent(address);
// 		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team181/${encodedAddress}`;
//
// 		http.get(url, (response) => {
// 			let data = '';
//
// 			// Collect data chunks
// 			response.on('data', (chunk) => {
// 				data += chunk;
// 			});
//
// 			// Once response has ended, parse the data
// 			response.on('end', () => {
// 				try {
// 					const geoData = JSON.parse(data);
// 					if (geoData.lat !== null && geoData.lon !== null) {
// 						resolve({ lat: geoData.lat, lon: geoData.lon });
// 					} else {
// 						resolve({ error: "Geolocation data not found for the address." });
// 					}
// 				} catch (_err) {
// 					resolve({ error: "Failed to parse geolocation data." });
// 				}
// 			});
// 		}).on('error', () => {
// 			resolve({ error: "Failed to fetch geolocation" });
// 		});
// 	});
// }
// // End of AI-generated code

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
