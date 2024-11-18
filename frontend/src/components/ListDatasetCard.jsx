import DatasetCard from "./DatasetCard";

function ListDatasetCard() {
	return (
		<div className="list-dataset" style={{ margin: "10px" }}>
			<h2>Datasets</h2>
			<ul>
				<DatasetCard></DatasetCard>
				<DatasetCard></DatasetCard>
				<DatasetCard></DatasetCard>
				<DatasetCard></DatasetCard>
				<DatasetCard></DatasetCard>
			</ul>
		</div>
	);
}

export default ListDatasetCard;
