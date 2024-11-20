import { Box, Button, Flex, Text } from "@chakra-ui/react";

function DatasetCard(props) {
    const { dataset, deleteDataset, selectDataset } = props;

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

    const handleSelect = () => {
        selectDataset(dataset.id);
    };

	return (
		<Box p={4} shadow="lg" borderWidth="1px" borderRadius="md" cursor="pointer">
			<Flex justify="space-between" align="center">
				<Flex align="center">
					<input
						type="radio"
						name="dataset"
						value={dataset.id}
						onChange={handleSelect}
						style={{ marginRight: "10px" }}
					/>
					<Text p={"5"}>{dataset.id}</Text>
				</Flex>
				<Button colorScheme="red" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
					Delete
				</Button>
			</Flex>
		</Box>
	);
}

export default DatasetCard;
