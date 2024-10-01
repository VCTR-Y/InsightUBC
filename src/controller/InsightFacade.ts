import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets = new Map<string, InsightDataset>();
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!

		return new Promise((resolve, reject) => {
			if (id === null || id.includes("_") || id.trim().length === 0) {
				return reject(new InsightError("Invalid Dataset ID"));
			}

			if (this.datasets.has(id)) {
				return reject(new InsightError("Dataset Already Exists"));
			}

			if (kind !== InsightDatasetKind.Sections) {
				return reject(new InsightError("Invalid Dataset Kind"));
			}

			try {
				return resolve(["unimplemented"]);
			} catch (err) {
				return reject(new InsightError("Something went wrong" + err + content));
			}
		});

		// throw new Error(
		// 	`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		// );
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		// throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);

		return new Promise((resolve, reject) => {
			if (id === null || id.includes("_") || id.trim().length === 0) {
				return reject(new InsightError("Invalid Dataset ID"));
			}

			if (!this.datasets.has(id)) {
				return reject(new InsightError("Dataset doesn't exist"));
			}

			try {
				this.datasets.delete(id);
				return resolve(id);
			} catch (err) {
				return reject(new InsightError("Something went wrong" + err));
			}
		});
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
