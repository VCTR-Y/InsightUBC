import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import * as fs from "fs-extra";

describe("Facade C3", function () {
	let server: Server;
	const port = 4321;

	before(async function () {
		Log.info("gets here");
		server = new Server(port);
		await server
			.start()
			.then(() => {
				Log.info("before: server started");
			})
			.catch((err: Error) => {
				Log.error(`ERROR: ${err.message}`);
				throw err;
			});
	});

	after(async function () {
		if (server) {
			await server.stop();
			Log.info("after: server stopped");
		}
	});

	beforeEach(function () {
		Log.info("beforeEach: Preparing to run a test case");
	});

	afterEach(function () {
		Log.info("afterEach: Test case completed");
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/ubc/sections";
		const ZIP_FILE_DATA = await fs.readFile("test/resources/archives/" + "pair.zip");
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// Log the request and response details
					Log.info(`Request made to ${SERVER_URL}${ENDPOINT_URL}`);
					Log.info(`Response status: ${res.status}`);
					Log.info(`Response error: ${res.error}`);
					expect(res.status).to.be.equal(StatusCodes.OK);
				})
				.catch(function (err) {
					// Log the error
					Log.error(`Request to ${SERVER_URL}${ENDPOINT_URL} failed: ${err}`);
					expect.fail();
				});
		} catch (err) {
			// Log the caught error
			Log.error(`Unexpected error occurred: ${err}`);
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
