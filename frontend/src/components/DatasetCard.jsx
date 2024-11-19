import { Box, Button, Flex, Text } from "@chakra-ui/react";

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
        <Box p={5} shadow="lg" borderWidth="1px" borderRadius="md">
            <Flex justify="space-between" align="center">
                <Text p={5}>{dataset.id}</Text>
                <Button colorScheme="red" onClick={handleDelete}>
                    Delete
                </Button>
            </Flex>
        </Box>
	);
}

export default DatasetCard;
