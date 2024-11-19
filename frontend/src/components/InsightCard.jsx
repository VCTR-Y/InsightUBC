import { Box, Heading, FormControl, FormLabel, Select } from "@chakra-ui/react";

function InsightCard() {

	return (
		<Box className="dataset-insight" m={"10"} p={"5"}>
			<Heading as="h2" size="lg">Dataset Insights</Heading>
			<FormControl>
				<FormLabel m="5px">Select a Dataset Insight</FormLabel>
				<Select m="5px">
					<option value="passRate">Pass rate for each course filtered by department</option>
					<option value="profAverage">Average for each professor for a course</option>
					<option value="courseAverage">Average over the years for a course</option>
				</Select>
				<Heading as="h1" size="xl">GRAPH WILL BE HERE</Heading>
			</FormControl>
		</Box>
	);
}

export default InsightCard;
