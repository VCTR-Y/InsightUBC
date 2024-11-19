import { useState } from "react";
import AddDatasetCard from "./components/AddDatasetCard.jsx";
import Header from "./components/Header.jsx";
import InsightCard from "./components/InsightCard.jsx";
import ListDatasetCard from "./components/ListDatasetCard.jsx";
import { HStack, VStack } from "@chakra-ui/react";

function App() {
	const [datasets, setDatasets] = useState([]);

	const addDataset = (newDataset) => {
		setDatasets((prevDatasets) => [...prevDatasets, newDataset]);
	};

	const deleteDateset = (id) => {
		setDatasets((prevDatasets) => prevDatasets.filter((dataset) => dataset.id !== id));
	};

	return (
		<div style={{ textAlign: "center" }}>
			<Header></Header>
			<VStack>
			<HStack>
			<AddDatasetCard addDataset={addDataset}></AddDatasetCard>
			<ListDatasetCard datasets={datasets} deleteDataset={deleteDateset}></ListDatasetCard>
			</HStack>
			<InsightCard></InsightCard>
			</VStack>
		</div>
	);
}

export default App;
