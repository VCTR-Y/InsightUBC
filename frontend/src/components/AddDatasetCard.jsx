import { useState } from "react";
function AddDatasetCard() {
	const [id, setId] = useState("");
	const [zip, setZip] = useState("");

	const handleUpload = async (e) => {
		e.preventDefault();

		if (!id || !zip) {
			alert("Both ID and file are required!");
			return;
		}
	};

	return (
		<div className="add-dataset" style={{ margin: "10px" }}>
			<h2>Add A Dataset</h2>
			<form onSubmit={handleUpload}>
				<div>
					<label style={{ margin: "10px" }}>Dataset ID:</label>
					<input type="text" style={{ margin: "10px" }} value={id} onChange={(e) => setId(e.target.value)} />
				</div>
				<div>
					<label style={{ margin: "10px" }}>Select A Dataset Zip File:</label>
					<input type="file" value={zip} onChange={(e) => setZip(e.target.value)} />
				</div>
				<button style={{ margin: "10px" }}>Upload Dataset</button>
			</form>
		</div>
	);
}

export default AddDatasetCard;
