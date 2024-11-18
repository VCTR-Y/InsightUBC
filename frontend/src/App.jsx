import { useState } from "react";
import AddDatasetCard from "./components/AddDatasetCard.jsx";
import Header from "./components/Header.jsx";
import InsightCard from "./components/InsightCard.jsx";
import ListDatasetCard from "./components/ListDatasetCard.jsx";

function App() {
	const [datasets, setDatasets] = useState([]);
	return (
		<div style={{ textAlign: "center" }}>
			<Header></Header>
			<AddDatasetCard></AddDatasetCard>
			<ListDatasetCard></ListDatasetCard>
			<InsightCard></InsightCard>
		</div>
	);
}

export default App;
