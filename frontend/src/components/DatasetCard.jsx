function DatasetCard(props) {
	const {dataset} = props;
	return (
		<li style={{ padding: "5px" }}>
			{dataset.id}
			<button style={{ margin: "5px" }}>Delete</button>
		</li>
	);
}

export default DatasetCard;
