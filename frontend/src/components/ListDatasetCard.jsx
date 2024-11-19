import DatasetCard from "./DatasetCard";

function ListDatasetCard(props) {
	const {datasets} = props;
	return (
		<div className="list-dataset" style={{ margin: "10px" }}>
			<h2>Datasets</h2>
			<ul>
				{datasets.map((dataset, index) => {
					return <DatasetCard key={dataset.id} dataset={dataset}></DatasetCard>
				})}
			</ul>
		</div>
	);
}

export default ListDatasetCard;
