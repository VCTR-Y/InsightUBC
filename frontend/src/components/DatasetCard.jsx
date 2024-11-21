import { Box, Button, Flex, IconButton, Popover, PopoverAnchor, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader, PopoverTrigger, Text, Tooltip, useToast } from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";

function DatasetCard(props) {
    const toast = useToast();
	const { dataset, deleteDataset, selectDataset } = props;

    const handleDelete = async () => {
        try {
            const toastId = toast({
				title: "Deleting dataset...",
				status: "loading",
                position: "top-right",
				duration: null, // Keep it open until updated
				isClosable: true,
			  });

            const response = await fetch(`http://localhost:4321/dataset/${dataset.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                deleteDataset(dataset.id);
                toast.update(toastId, {
					title: "Dataset deleted successfully",
					status: "success",
					duration: 5000,
					isClosable: true,
				  });
            } else {
				toast.update(toastId, {
					title: "Failed to delete dataset",
					description: "Please check your input and try again.",
					status: "error",
					duration: 5000,
					isClosable: true,
				  });	            }
        } catch (err) {
			toast({
				title: "Something went wrong",
				description: `Error: ${err.message}`,
				status: "error",
				duration: 5000,
				isClosable: true,
			  });        }
    };

	const handleSelect = () => {
		selectDataset(dataset.id);
	};

	const renderCardContent = () => (
		<Box shadow="lg" borderWidth="1px" borderRadius="md" cursor="pointer" p={4}>
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
				<Flex align="center">
				<Tooltip  label={`Num rows: ${dataset.numRows}`}>
					<InfoOutlineIcon m={"5"}  />
				</Tooltip>
				<Button colorScheme="red" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
					Delete
				</Button>
				</Flex>
			</Flex>
		</Box>
	);

	return renderCardContent();
}

export default DatasetCard;
