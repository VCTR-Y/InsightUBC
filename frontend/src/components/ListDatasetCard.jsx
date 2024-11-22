import { Heading, Box, List } from "@chakra-ui/react";
import DatasetCard from "./DatasetCard";

function ListDatasetCard(props) {
	const { datasets, deleteDataset, selectDataset } = props;
	return (
		<Box className="list-dataset" m="10px" p={"5"} minH={"300px"} minW={"300px"}>
			<Heading as="h2" size="lg" m="10px">Datasets</Heading>
			<Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={6} sx={{ '@media (min-width: 600px)': { gridTemplateColumns: datasets.length >= 2 ? "repeat(2, 1fr)" : "repeat(1, 1fr)" } }}>
				{datasets.map((dataset, index) => {
					return <DatasetCard key={dataset.id} dataset={dataset} deleteDataset={deleteDataset} selectDataset={selectDataset}></DatasetCard>;
				})}
			</Box>
		</Box>
	);
}

export default ListDatasetCard;
