import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;
	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		rooms = await getContentFromArchives("campus.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddSectionDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an empty content", async function () {
			try {
				const empty = await getContentFromArchives("empty.zip");
				await facade.addDataset("ubc", empty, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with course files not starting with result", async function () {
			try {
				const notresult = await getContentFromArchives("notresult.zip");
				await facade.addDataset("ubc", notresult, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an invalid file structure", async function () {
			try {
				const notcourses = await getContentFromArchives("notcourses.zip");
				await facade.addDataset("ubc", notcourses, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with malformed JSON", async function () {
			try {
				const malformed = await getContentFromArchives("malformed.zip");
				await facade.addDataset("ubc", malformed, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an invalid dataset id", async function () {
			try {
				await facade.addDataset("_123", sections, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with solely whitespace id", async function () {
			try {
				await facade.addDataset("                  ", sections, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with duplicate dataset id", async function () {
			try {
				await facade.addDataset("123", sections, InsightDatasetKind.Sections);
				await facade.addDataset("123", sections, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if content is not a valid Base64 zip", async function () {
			const invalidBase64 = "not a base64 string";
			try {
				await facade.addDataset("ubc", invalidBase64, InsightDatasetKind.Sections);
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a dataset", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			expect(result).to.have.members(["ubc"]);
		});

		it("should successfully add multiple valid datasets", async function () {
			const result1 = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result2 = await facade.addDataset("sfu", sections, InsightDatasetKind.Sections);
			expect(result1).to.have.members(["ubc"]);
			expect(result2).to.have.members(["ubc", "sfu"]);
		});

		// it("should successfully add a room dataset", async function() {
		// 	const result = await facade.addDataset("room", rooms, InsightDatasetKind.Rooms);
		// 	expect(result).to.have.members(["room"]);
		// });

		// it("should successfully add multiple valid datasets - persist", async function () {
		// 	const result1 = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		// 	expect(result1).to.have.members(["ubc"]);
		// 	await new InsightFacade().addDataset("sfu", sections, InsightDatasetKind.Sections);
		// 	const testFacade = new InsightFacade();
		// 	const result2 = await testFacade.addDataset("uvic", sections, InsightDatasetKind.Sections);
		// 	expect(result2).to.have.members(["ubc", "sfu", "uvic"]);
		// });
	});

	describe("AddRoomsDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with index.htm not found", async function () {
			try {
				const noIndex = await getContentFromArchives("campusNoIndex.zip");
				await facade.addDataset("room", noIndex, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with buildings-and-classrooms folder not found", async function () {
			try {
				const noBuildingFolder = await getContentFromArchives("campusNoBuildingFolder.zip");
				await facade.addDataset("room", noBuildingFolder, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with empty buildings-and-classrooms folder", async function () {
			try {
				const emptyBuildingFolder = await getContentFromArchives("campusEmptyBuildingFolder.zip");
				await facade.addDataset("room", emptyBuildingFolder, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with no table in index.htm", async function () {
			try {
				const noTable = await getContentFromArchives("campusNoTable.zip");
				await facade.addDataset("room", noTable, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with no correct td class in index.htm", async function () {
			try {
				const noCorrectClass = await getContentFromArchives("campusNoCorrectClass.zip");
				await facade.addDataset("room", noCorrectClass, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject a rooms dataset with only a building file not in index", async function () {
			try {
				const notInIndex = await getContentFromArchives("campusBFileNotInIndex.zip");
				await facade.addDataset("room", notInIndex, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject a rooms dataset with only a building file with no table", async function () {
			try {
				const noTable = await getContentFromArchives("campusBuildingNoTable.zip");
				await facade.addDataset("room", noTable, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject a rooms dataset with only building file with invalid data", async function () {
			try {
				const invalidData = await getContentFromArchives("campusInvalidRoomData.zip");
				await facade.addDataset("room", invalidData, InsightDatasetKind.Rooms);
				expect.fail("Should throw here");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a rooms dataset with only one building file", async function () {
			const oneBFile = await getContentFromArchives("campusOneBuildingFile.zip");
			const result = await facade.addDataset("ubc", oneBFile, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["ubc"]);
		});

		it("should successfully add a rooms dataset", async function () {
			const result = await facade.addDataset("ubc", rooms, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["ubc"]);
		});

		it("should successfully add a sections and rooms dataset", async function () {
			await facade.addDataset("ubcc", rooms, InsightDatasetKind.Rooms);
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubcc", "ubc"]);
		});
	});

	describe("ListDatasets", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should list one dataset", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				const datasets = await facade.listDatasets();

				expect(datasets).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (_err) {
				// console.log(_err);
				expect.fail("Should not throw an error.");
			}
		});

		it("should list nothing", async function () {
			try {
				const datasets = await facade.listDatasets();

				expect(datasets).to.deep.equal([]);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});

		it("should list nothing after remove", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("ubc");
				const datasets = await facade.listDatasets();

				expect(datasets).to.deep.equal([]);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});

		it("multiple instances of InsightFacade", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				const testFacade: InsightFacade = new InsightFacade();
				await testFacade.addDataset("sfu", rooms, InsightDatasetKind.Rooms);
				const datasets1 = await testFacade.listDatasets();

				expect(datasets1).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
					{
						id: "sfu",
						kind: InsightDatasetKind.Rooms,
						numRows: 364,
					},
				]);
				await testFacade.removeDataset("ubc");

				const datasets3 = await testFacade.listDatasets();

				expect(datasets3).to.deep.equal([
					{
						id: "sfu",
						kind: InsightDatasetKind.Rooms,
						numRows: 364,
					},
				]);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});

		// it("multiple instances of InsightFacade v2", async function () {
		// 	try {
		// 		await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		// 		await facade.addDataset("sfu", sections, InsightDatasetKind.Sections);
		// 		const a = await facade.listDatasets();
		// 		expect(a).to.deep.equal([
		// 			{
		// 				id: "ubc",
		// 				kind: InsightDatasetKind.Sections,
		// 				numRows: 64612,
		// 			},
		// 			{
		// 				id: "sfu",
		// 				kind: InsightDatasetKind.Sections,
		// 				numRows: 64612,
		// 			},
		// 		]);
		// 		const testDataset: InsightFacade = new InsightFacade();
		// 		await testDataset.removeDataset("sfu");
		// 		const datasets = await testDataset.listDatasets();
		//
		// 		expect(datasets).to.deep.equal([
		// 			{
		// 				id: "ubc",
		// 				kind: InsightDatasetKind.Sections,
		// 				numRows: 64612,
		// 			},
		// 		]);
		// 	} catch (_err) {
		// 		expect.fail("Should not throw an error.");
		// 	}
		// });
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with nonexistent id", async function () {
			try {
				await facade.removeDataset("ubc");
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject id with solely whitespace", async function () {
			try {
				await facade.removeDataset("     ");
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject id with an underscore", async function () {
			try {
				await facade.removeDataset("_123");
				expect.fail("Should throw here.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should remove dataset", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("ubc");

				const datasets = await facade.listDatasets();
				expect(datasets.length).to.eq(0);
			} catch (_) {
				expect.fail("Should not throw an error.");
			}
		});

		it("should remove multiple datasets", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				await facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("ubc");
				await facade.removeDataset("ubc2");
				const datasets = await facade.listDatasets();
				expect(datasets.length).to.eq(0);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});

		// it("should remove dataset - persist 1", async function () {
		// 	this.timeout(10000);
		// 	try {
		// 		await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		//
		// 		const facade2 = new InsightFacade();
		// 		await facade2.removeDataset("ubc");
		//
		// 		const result = await new InsightFacade().addDataset("ubc", sections, InsightDatasetKind.Sections);
		//
		// 		expect(result).to.have.members(["ubc"]);
		// 	} catch (err) {
		// 		console.log(err);
		// 		expect.fail("Should not throw an error.");
		// 	}
		// });
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[];
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				// expect(result).to.deep.equal(expected);
				// console.log(result);
				// console.log(expected);
				expect(result).to.have.deep.members(expected);
			} catch (err) {
				// console.log(err);
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (err instanceof ResultTooLargeError) {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect(err).to.be.instanceOf(InsightError);
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/simple2.json] SELECT dept, id, year avg WHERE NOT (avg < 97)", checkQuery);
		it("[valid/simple3.json] SELECT dept, avg, pass WHERE dept IS engl* AND avg > 75 AND pass > 60", checkQuery);
		it("[valid/simple4.json] SELECT dept, audit WHERE dept IS NOT cpsc AND audit = 5", checkQuery);
		it(
			"[valid/simple5.json] SELECT instructor, avg, fail WHERE instructor IS *wolfman* AND avg > 90 OR fail < 10",
			checkQuery
		);
		it("[valid/sort.json] SORT 1", checkQuery);
		it("[valid/sort2.json] SORT 2", checkQuery);
		it("[valid/sort3.json] SORT 3", checkQuery);

		it("[valid/group.json] GROUP 1", checkQuery);
		it("[valid/room.json] ROOM 1", checkQuery);
		it(
			"[valid/complex.json] SELECT dept, id, avg WHERE (avg > 90 AND dept = 'adhe') OR avg = 95 ORDER BY avg",
			checkQuery
		);
		it("[valid/contains-inputstring.json] SELECT dept, avg WHERE dept IS '*cpsc*'", checkQuery);
		it("[valid/wildcard-ends-with.json] SELECT dept, avg WHERE dept IS '*cpsc'", checkQuery);
		it("[valid/wildcard-match-exactly.json] SELECT dept, avg WHERE dept IS 'cpsc'", checkQuery);
		it("[valid/wildcard-starts-with.json] SELECT dept, avg WHERE dept IS 'cpsc*'", checkQuery);
		it("[invalid/middle-asterisk.json] Query with asterisk in the middle", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/invalid2.json] Query missing OPTIONS", checkQuery);
		it("[invalid/invalid3.json] Query with invalid filter key", checkQuery);
		it("[invalid/invalid4.json] Query with WHERE not being an object", checkQuery);
		it("[invalid/invalid5.json] Query with invalid JSON", checkQuery);
		it("[invalid/invalid6.json] Query with invalid key in COLUMNS", checkQuery);
		it("[invalid/invalid7.json] Query with invalid key in ORDER", checkQuery);
		it("[invalid/invalid8.json] Query with invalid ORDER type", checkQuery);
		it("[invalid/invalid9.json] Query with invalid COLUMN type", checkQuery);
		it("[invalid/invalid10.json] Query with invalid keys in OPTIONS", checkQuery);
		it("[invalid/invalid11.json] Query with invalid and contents", checkQuery);
		it("[invalid/invalid12.json] Query with invalid filter", checkQuery);
		it("[invalid/nonobject.json] Query missing object", checkQuery);
		it("[invalid/nonexistent.json] Query with nonexistent dataset", checkQuery);
		it("[invalid/incorrect.json] Query with invalid key", checkQuery);
		it("[invalid/multiple.json] Query with multiple datasets", checkQuery);
		it("[invalid/wildcard.json] Query with wildcard mutant", checkQuery);
		it("[invalid/asterisk.json] Query with only asterisks", checkQuery);

		it("run in new instance", async function () {
			const testTitle = "[valid/simple.json] SELECT dept, avg WHERE avg > 97";
			const { input, expected, errorExpected } = await loadTestQuery(testTitle);
			let result: InsightResult[];

			try {
				// await facade.removeDataset("ubc");
				result = await new InsightFacade().performQuery(input);
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				// expect(result).to.deep.equal(expected);
				expect(result).to.have.deep.members(expected);
			} catch (err) {
				// console.log(err);
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (err instanceof ResultTooLargeError) {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect(err).to.be.instanceOf(InsightError);
				}
			}
		});
	});
});
