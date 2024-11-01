import JSZip from "jszip";
import { GeoResponse, InsightError } from "./IInsightFacade";
import http from "node:http";

export async function getRoomsFromContent(content: string): Promise<any[]> {
	const zip = new JSZip();
	const data = await zip.loadAsync(content, { base64: true });
	const parse5 = require("parse5");
	const indexFile = data.file("index.htm");
	// const buildingsPath = "campus/discover/buildings-and-classrooms/";
	// const rooms = Object.keys(data.files);

	if (!indexFile) {
		throw new InsightError("Index.htm file not found");
	}
	// if (!rooms.includes(buildingsPath)) {
	// 	throw new InsightError("buildings-and-classrooms folder not found");
	// }

	const indexContent = await indexFile.async("text");
	const document = parse5.parse(indexContent);
	const buildingTable = findBuildingTable(document);

	if (!buildingTable) {
		throw new InsightError("No Valid Table");
	}

	const buildings = await parseBuildingsFromTable(buildingTable);

	const allRooms: any[] = [];
	await Promise.all(
		buildings.map(async (building) => {
			const room = await parseBuildingRooms(building, data);
			allRooms.push(...room);
		})
	);
	{
		return allRooms;
	}
}

async function parseBuildingsFromTable(buildingTable: any): Promise<any[]> {
	const buildings = await parseBuildings(buildingTable);
	if (buildings.length === 0) {
		throw new InsightError("no valid buildings");
	}
	return buildings;
}

async function parseBuildingRooms(building: any, data: any): Promise<any[]> {
	const parse5 = require("parse5");
	const buildingFile = data.file(building.buildinghref);
	if (!buildingFile) {
		return [];
	}
	const buildingContent = await buildingFile.async("text");
	const bDocument = parse5.parse(buildingContent);
	const roomTable = findRoomTable(bDocument);

	if (!roomTable) {
		return [];
	}

	return parseRooms(bDocument, building);
}

function findBuildingTable(document: string): any {
	const tables = findNodesByTag(document, "table");
	for (const table of tables) {
		if (containsValidBuildingData(table)) {
			return table;
		}
	}
	return null;
}

function containsValidBuildingData(table: any): boolean {
	const cells = findNodesByTag(table, "td");

	let hasTitle = false;
	let hasAddress = false;

	for (const cell of cells) {
		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
		if (classAttr) {
			const cellClasses = classAttr.value.split(" ");
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-title")) {
				hasTitle = true;
			}
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-building-address")) {
				hasAddress = true;
			}
		}
	}

	return hasTitle && hasAddress;
}

function findRoomTable(document: string): any {
	const tables = findNodesByTag(document, "table");
	for (const table of tables) {
		if (containsValidRoomData(table)) {
			return table;
		}
	}
	return null;
}

function containsValidRoomData(table: any): boolean {
	const cells = findNodesByTag(table, "th");

	let hasRoom = false;
	let hasCapacity = false;
	let hasFurniture = false;
	let hasType = false;

	for (const cell of cells) {
		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
		if (classAttr) {
			const cellClasses = classAttr.value.split(" ");
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-number")) {
				hasRoom = true;
			}
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-capacity")) {
				hasCapacity = true;
			}
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-furniture")) {
				hasFurniture = true;
			}
			if (cellClasses.includes("views-field") && cellClasses.includes("views-field-field-room-type")) {
				hasType = true;
			}
		}
	}
	return hasRoom && hasCapacity && hasFurniture && hasType;
}

function findNodesByTag(node: any, tagName: string): any[] {
	const nodes: any[] = [];

	if (node.tagName === tagName) {
		nodes.push(node);
	}

	if (node.childNodes && Array.isArray(node.childNodes)) {
		for (const child of node.childNodes) {
			nodes.push(...findNodesByTag(child, tagName));
		}
	}

	return nodes;
}

// These functions were written with the assistance of and partly generated by ChatGPT
async function parseBuildings(buildingTable: any): Promise<any[]> {
	const rows = findNodesByTag(buildingTable, "tr");

	const buildings = await Promise.all(rows.map(async (row) => parseBuildingRow(row)));

	return buildings.filter((building) => building !== null);
}

// Parse an individual row for building details
async function parseBuildingRow(row: any): Promise<any | null> {
	const titleCell = findCellByClass(row, "views-field-title");
	const addressCell = findCellByClass(row, "views-field-field-building-address");

	if (titleCell && addressCell) {
		const fullname = getTextContent(titleCell);
		const link = findNodesByTag(titleCell, "a")[0];
		const shortname = getShortnameFromLink(link);
		const href = link ? link.attrs.find((attr: any) => attr.name === "href")?.value.replace("./", "") : null;
		const address = getTextContent(addressCell);

		const { lat, lon, error } = await fetchGeolocation(address);

		if (error) {
			return null;
		}

		if (typeof lat !== "number" || typeof lon !== "number") {
			return null;
		}

		return {
			fullname: fullname,
			shortname: shortname,
			address: address,
			lat: lat,
			lon: lon,
			buildinghref: href,
		};
	}
	return null;
}

// Helper to get a specific cell by class
function findCellByClass(row: any, className: string): any | null {
	return findNodesByTag(row, "td").find((cell) => {
		const classAttr = cell.attrs?.find((attr: any) => attr.name === "class");
		return classAttr?.value.split(" ").includes(className);
	});
}

// Helper to extract text content, stripping out HTML tags
function getTextContent(cell: any): string {
	return require("parse5")
		.serialize(cell)
		.replace(/(<([^>]+)>)/gi, "")
		.trim();
}

// Helper to extract shortname from a link's href attribute
function getShortnameFromLink(link: any): string | null {
	const hrefAttr = link?.attrs?.find((attr: any) => attr.name === "href");
	return hrefAttr ? hrefAttr.value.split("/").pop()?.split(".")[0] : null;
}

function parseRooms(html: string, building: any): any[] {
	const rows = findNodesByTag(html, "tr");
	return rows.map((row) => parseRoomRow(row, building)).filter((room) => room !== null);
}

// Parses individual row for room details
function parseRoomRow(row: any, building: any): any | null {
	const number = getCellContent(row, "views-field-field-room-number");
	const seats = getCellContent(row, "views-field-field-room-capacity");
	let furniture = getCellContent(row, "views-field-field-room-furniture");
	const type = getCellContent(row, "views-field-field-room-type");
	const href = getCellHref(row, "views-field-field-room-number");

	if (furniture) {
		furniture = furniture.replace(/&amp;/g, "&");
	}

	if (number && seats && furniture && type && href) {
		return {
			...building,
			number: String(number.trim()),
			name: building.shortname + "_" + number.trim(),
			seats: Number(seats.trim()),
			furniture: furniture.trim(),
			type: type.trim(),
			href: href.trim(),
		};
	}
	return null;
}

// Helper function to get content of a cell by class name
function getCellContent(row: any, className: string): string | null {
	const parse5 = require("parse5");
	const cell = findNodesByTag(row, "td").find((cel) => {
		const classAttr = cel.attrs?.find((attr: any) => attr.name === "class");
		return classAttr?.value.includes(className);
	});
	return cell ? parse5.serialize(cell).replace(/(<([^>]+)>)/gi, "") : null;
}

// Helper function to get the href attribute from an anchor tag within a cell
function getCellHref(row: any, className: string): string | null {
	const cell = findNodesByTag(row, "td").find((cel) => {
		const classAttr = cel.attrs?.find((attr: any) => attr.name === "class");
		return classAttr?.value.includes(className);
	});

	if (cell) {
		const anchorTag = findNodesByTag(cell, "a")[0];
		const hrefAttr = anchorTag?.attrs?.find((attr: any) => attr.name === "href");
		return hrefAttr ? hrefAttr.value : null;
	}
	return null;
}
// End of AI-generated code

// This function was generated by CHATGPT
async function fetchGeolocation(address: string): Promise<GeoResponse> {
	return new Promise((resolve) => {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team181/${encodedAddress}`;
		http
			.get(url, (response) => {
				let data = "";

				// Collect data chunks
				response.on("data", (chunk) => {
					data += chunk;
				});

				// Once response has ended, parse the data
				response.on("end", () => {
					try {
						const geoData = JSON.parse(data);
						if (geoData.lat !== undefined && geoData.lon !== undefined) {
							resolve({ lat: geoData.lat, lon: geoData.lon });
						} else {
							resolve({ error: "Geolocation data not found for the address." });
						}
					} catch (_err) {
						resolve({ error: "Failed to parse geolocation data." });
					}
				});
			})
			.on("error", () => {
				resolve({ error: "Failed to fetch geolocation" });
			});
	});
}
// End of AI-generated code
