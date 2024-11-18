function InsightCard() {
	return (
		<div className="dataset-insight" style={{ margin: "10px" }}>
			<h2>Dataset Insights</h2>
			<form>
				<label>Select a Dataset Insight</label>
				<select>
					<option>Pass rate for each course filtered by department</option>
					<option>Average for each professor for a course</option>
					<option>Average over the years for a course</option>
				</select>
				<h1>GRAPH WILL BE HERE</h1>
			</form>
		</div>
	);
}

export default InsightCard;
