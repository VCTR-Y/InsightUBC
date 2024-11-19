import { useState } from "react";
import AddDatasetCard from "./components/AddDatasetCard.jsx";
import Header from "./components/Header.jsx";
import InsightCard from "./components/InsightCard.jsx";
import ListDatasetCard from "./components/ListDatasetCard.jsx";

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
			<AddDatasetCard addDataset={addDataset}></AddDatasetCard>
			<ListDatasetCard datasets={datasets} deleteDataset={deleteDateset}></ListDatasetCard>
			<InsightCard></InsightCard>
		</div>
	);
}

export default App;
