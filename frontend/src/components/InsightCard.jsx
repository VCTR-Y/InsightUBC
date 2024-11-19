function InsightCard() {
	return (
		<div className="dataset-insight" style={{ margin: "10px" }}>
			<h2>Dataset Insights</h2>
			<form>
				<label style={{ margin: "5px" }}>Select a Dataset Insight</label>
				<select style={{ margin: "5px" }}>
					<option value="passRate">Pass rate for each course filtered by department</option>
					<option value="profAverage">Average for each professor for a course</option>
					<option value="courseAverage">Average over the years for a course</option>
				</select>
				<h1>GRAPH WILL BE HERE</h1>
			</form>
		</div>
	);
}

export default InsightCard;
