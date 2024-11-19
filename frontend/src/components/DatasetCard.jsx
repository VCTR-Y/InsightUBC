function DatasetCard(props) {
	const { dataset, deleteDataset } = props;

	const handleDelete = async () => {
		try {
			const response = await fetch(`http://localhost:4321/dataset/${dataset.id}`, {
				method: "DELETE",
			});

			if (response.ok) {
				deleteDataset(dataset.id);
				alert("Dataset deleted successfully.");
			} else {
				alert("Failed to delete dataset from server.");
			}
		} catch (err) {
			alert(`Error deleting dataset: ${err.message}`);
		}
	};

	return (
		<li style={{ padding: "5px" }}>
			{dataset.id}
			<button onClick={handleDelete} style={{ margin: "5px" }}>
				Delete
			</button>
		</li>
	);
}

export default DatasetCard;
