import { Box, Button, FormControl, FormLabel, Heading, Input, useToast } from "@chakra-ui/react";
import { DownloadIcon } from '@chakra-ui/icons'
import { useState } from "react";

function AddDatasetCard(props) {
	const { addDataset } = props;

	const [id, setId] = useState("");
	const [zip, setZip] = useState(null);
	const [isUploading, setIsUploading] = useState(false); 

	const toast = useToast();


	const handleUpload = async (e) => {
		e.preventDefault();

		if (!id || id.trim().length === 0 || id.includes("_")) {
			toast({
				title: "Invalid ID: It cannot contain underscores or be only whitespace.",
				status: "error",
				position: "top-right",
				duration: 5000, // Keep it open until updated
				isClosable: true,
			  });
			return;
		}

		if (!zip) {
			toast({
				title: "Both ID and file are required!	",
				status: "error",
				position: "top-right",
				duration: 5000, // Keep it open until updated
				isClosable: true,
			  });
			return;
		}

		const formData = new FormData();
		formData.append("file", zip);

		try {
			setIsUploading(true);	
			const toastId = toast({
				title: "Adding dataset...",
				status: "loading",
				position: "top-right",
				duration: null, // Keep it open until updated
				isClosable: true,
			  });
			
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
				toast.update(toastId, {
					title: "Dataset added successfully",
					status: "success",
					duration: 5000,
					isClosable: true,
				  });
			} else {
				toast.update(toastId, {
					title: "Failed to add dataset",
					description: "Please check your input and try again.",
					status: "error",
					duration: 5000,
					isClosable: true,
				  });			
				}
		} catch (err) {
			toast({
				title: "Something went wrong",
				description: `Error: ${err.message}`,
				status: "error",
				duration: 5000,
				isClosable: true,
			  });
		} finally {
			setIsUploading(false);
		}
	};

	const handleFileChange = (e) => {
		const selectedFile = e.target.files[0];
		if (selectedFile && ((selectedFile.type === "application/x-zip-compressed") || selectedFile.type === "application/zip")) {
			setZip(selectedFile);
		} else {
			toast({
				title: "Please select a valid zip file",
				status: "error",
				position: "top-right",
				duration: 5000,
				isClosable: true,
			  });	
			setZip(null);
			e.target.value = null;
		}
	};

	return (
		<Box className="add-dataset" m="10px" p="20px" h={"300px"}>
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
					<Input type="file" onChange={handleFileChange} display={"flex"} size={"auto"} />
				</FormControl>
				<Button rightIcon={<DownloadIcon/>} type="submit" colorScheme="blue" mt="10px" disabled={isUploading}>
					Upload Dataset
				</Button>
			</form>
		</Box>
	);
}

export default AddDatasetCard;
