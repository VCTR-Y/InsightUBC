import { useEffect, useState } from "react";
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

	const deleteDataset = (id) => {
		setDatasets((prevDatasets) => prevDatasets.filter((dataset) => dataset.id !== id));
	};

	const loadDatasets = async () => {
		try {
			const response = await fetch("http://localhost:4321/datasets");
			if (response.ok) {
				const data = await response.json();
				setDatasets(data.result);
			} else {
				alert("Failed to fetch datasets");
			}
		} catch (err) {
			alert(`Something went wrong ${err}`);
		}
	}

	const [selected, selectDataset] = useState(null);

	useEffect(() => {
        loadDatasets();
    }, []);

	return (
		<div style={{ textAlign: "center" }}>
			<Header></Header>
			<VStack>
			<HStack>
			<AddDatasetCard addDataset={addDataset}></AddDatasetCard>
			<ListDatasetCard datasets={datasets} deleteDataset={deleteDataset} selectDataset={selectDataset}></ListDatasetCard>
			</HStack>
			<InsightCard selectedDataset={selected}></InsightCard>
			</VStack>
		</div>
	);
}

export default App;
