import { Box, Button, FormControl, FormLabel, Heading, Input } from "@chakra-ui/react";
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
		if (selectedFile && selectedFile.type === "application/zip") {
			setZip(selectedFile);
		} else {
			alert("Please select a zip file");
			setZip(null);
			e.target.value = null;
		}
	};

	return (
		<Box className="add-dataset" m="10px" p="20px">
			<Heading as="h2" size="lg" mb="10px">
				Add A Dataset
			</Heading>
			<form onSubmit={handleUpload}>
				<FormControl id="dataset-id" mb="10px">
					<FormLabel>Dataset ID:</FormLabel>
					<Input type="text" value={id} onChange={(e) => setId(e.target.value)} />
				</FormControl>
				<FormControl id="dataset-file" mb="10px">
					<FormLabel>Select A Dataset Zip File:</FormLabel>
					<Input type="file" onChange={handleFileChange} />
				</FormControl>
				<Button type="submit" colorScheme="blue" mt="10px">
					Upload Dataset
				</Button>
			</form>
		</Box>
	);
}

export default AddDatasetCard;
