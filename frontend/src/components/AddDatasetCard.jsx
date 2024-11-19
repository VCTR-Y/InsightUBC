import { useState } from "react";
function AddDatasetCard(props) {
	const { addDataset } = props;

	const [id, setId] = useState("");
	const [zip, setZip] = useState(null);

	const handleUpload = async (e) => {
		e.preventDefault();

		if (!id || id.trim().length === 0 || id.includes("_")) {
			alert("Invalid ID: It cannot contain underscores or be only whitespace.");
			return;
		}

		if (!zip) {
			alert("Both ID and file are required!");
			return;
		}

		const formData = new FormData();
		formData.append("file", zip);

		try {
			const response = await fetch(`http://localhost:4321/dataset/${id}/sections`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/zip",
				},
				body: formData,
			});
			if (response.ok) {
				const newDataset = { id };
				addDataset(newDataset);
				alert("Dataset added successfully");
			} else {
				alert("Failed to add dataset");
			}
		} catch (err) {
			alert(`Something weng wrong ${err}`);
		}
	};

	const handleFileChange = (e) => {
		const selectedFile = e.target.files[0];
		if (selectedFile && selectedFile.type === "application/x-zip-compressed") {
			setZip(selectedFile);
		} else {
			alert("Please select a zip file");
			setZip(null);
			e.target.value = null;
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
					<input type="file" onChange={handleFileChange} />
				</div>
				<button style={{ margin: "10px" }}>Upload Dataset</button>
			</form>
		</div>
	);
}

export default AddDatasetCard;
