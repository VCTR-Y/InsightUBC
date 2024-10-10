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

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
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

		// it("should successfully add multiple valid datasets - persist", async function () {
		// 	const result1 = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		// 	expect(result1).to.have.members(["ubc"]);
		// 	await new InsightFacade().addDataset("sfu", sections, InsightDatasetKind.Sections);
		// 	const testFacade = new InsightFacade();
		// 	const result2 = await testFacade.addDataset("uvic", sections, InsightDatasetKind.Sections);
		// 	expect(result2).to.have.members(["ubc", "sfu", "uvic"]);
		// });
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
			} catch (err) {
				console.log(err);
				expect.fail("Should not throw an error.");
			}
		});

		it("multiple instances of InsightFacade", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				const testFacade: InsightFacade = new InsightFacade();
				await testFacade.addDataset("sfu", sections, InsightDatasetKind.Sections);
				// const datasets = await facade.listDatasets();
				const datasets1 = await testFacade.listDatasets();

				// expect(datasets).to.deep.equal([
				// 	{
				// 		id: "ubc",
				// 		kind: InsightDatasetKind.Sections,
				// 		numRows: 64612,
				// 	},
				// 	{
				// 		id: "sfu",
				// 		kind: InsightDatasetKind.Sections,
				// 		numRows: 64612,
				// 	},
				// ]);
				expect(datasets1).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
					{
						id: "sfu",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
				await testFacade.removeDataset("ubc");

				// const datasets2 = await facade.listDatasets();
				const datasets3 = await testFacade.listDatasets();

				// expect(datasets2).to.deep.equal([
				// 	{
				// 		id: "sfu",
				// 		kind: InsightDatasetKind.Sections,
				// 		numRows: 64612,
				// 	},
				// ]);
				expect(datasets3).to.deep.equal([
					{
						id: "sfu",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});

		it("multiple instances of InsightFacade v2", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				await facade.addDataset("sfu", sections, InsightDatasetKind.Sections);
				const a = await facade.listDatasets();
				expect(a).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
					{
						id: "sfu",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
				const testDataset: InsightFacade = new InsightFacade();
				await testDataset.removeDataset("sfu");
				const datasets = await testDataset.listDatasets();

				expect(datasets).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (_err) {
				expect.fail("Should not throw an error.");
			}
		});
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
		// 	try {
		// 		await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		//
		// 		const facade2 = new InsightFacade();
		// 		await facade2.removeDataset("ubc");
		//
		// 		const datasets = await new InsightFacade().listDatasets();
		// 		expect(datasets.length).to.eq(0);
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
		it("[invalid/nonobject.json] Query missing object", checkQuery);
		it("[invalid/nonexistent.json] Query with nonexistent dataset", checkQuery);
		it("[invalid/incorrect.json] Query with invalid key", checkQuery);
		it("[invalid/multiple.json] Query with multiple datasets", checkQuery);
		it("[invalid/wildcard.json] Query with wildcard mutant", checkQuery);
		it("[invalid/asterisk.json] Query with only asterisks", checkQuery);
	});
});
