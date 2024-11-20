import { useState, useEffect } from "react";
import { Box, Heading, FormControl, FormLabel, Select, Input, Button } from "@chakra-ui/react";

import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function InsightCard(props) {
	const { selectedDataset } = props;
	const [selectedValue, setSelectedValue] = useState("passRate");

	const [dept, setDept] = useState("");
	const [course, setCourse] = useState("");
	const [chartData, setChartData] = useState(null);
	// const insightOptions = {
	// 	"passRate": "SELECT dept, course, AVG(passRate) FROM dataset WHERE dept = ? GROUP BY course",
	// 	"profAverage": "SELECT professor, AVG(grade) FROM dataset WHERE dept = ? AND course = ? GROUP BY professor",
	// 	"courseAverage": "SELECT course, AVG(grade) FROM dataset WHERE dept = ? AND course = ? GROUP BY year"
	// };

	const insightOptions = {
		"passRate": {
            "WHERE": {
                "IS": {
                    [`${selectedDataset}_dept`]: dept.toLowerCase()
                }
            },
            "OPTIONS": {
                "COLUMNS": [
                    `${selectedDataset}_id`,
                    "avgPass",
					"avgFail",
					"avgAudit"
                ],
                "ORDER": {
                    "dir": "DOWN",
                    "keys": ["avgPass"]
                }
            },
            "TRANSFORMATIONS": {
                "GROUP": [`${selectedDataset}_id`],
                "APPLY": [{
                    "avgPass": {
                        "AVG": `${selectedDataset}_pass`
                    }
                },
				{
					"avgFail": {
						"AVG": `${selectedDataset}_fail`
					}
				},
				{
					"avgAudit": {
						"AVG": `${selectedDataset}_audit`
					}
				},
			]
            }
        },
		"profAverage": {
            "WHERE": {
				"AND": [
				{
					"IS": {
						[`${selectedDataset}_dept`]: dept.toLowerCase()
						}
				},
				{
					"IS": {
						[`${selectedDataset}_id`]: course.toLowerCase()
					}
				},
				]
			},
            "OPTIONS": {
                "COLUMNS": [
                    `${selectedDataset}_instructor`,
                    "overallAvg",
                ],
                "ORDER": {
                    "dir": "DOWN",
                    "keys": ["overallAvg"]
                }
            },
            "TRANSFORMATIONS": {
                "GROUP": [`${selectedDataset}_instructor`],
                "APPLY": [{
                    "overallAvg": {
                        "AVG": `${selectedDataset}_avg`
                    }
                },
			]
            }
        },
		"courseAverage": {
            "WHERE": {
				"AND": [{
                "IS": {
                    [`${selectedDataset}_dept`]: dept.toLowerCase()
					}
					},
					{
						"IS": {
							[`${selectedDataset}_id`]: course.toLowerCase()
						}
					},
					{
						"NOT": {
							"EQ": {
								[`${selectedDataset}_year`]: 1900
							}
						}
					}
				]
			},
            "OPTIONS": {
                "COLUMNS": [
                    `${selectedDataset}_year`,
                    "overallAvg",
                ],
                "ORDER": {
                    "dir": "UP",
                    "keys": [`${selectedDataset}_year`]
                }
            },
            "TRANSFORMATIONS": {
                "GROUP": [`${selectedDataset}_year`],
                "APPLY": [{
                    "overallAvg": {
                        "AVG": `${selectedDataset}_avg`
                    }
                },
			]
            }
        }
	};

	const queryInsight = async (insight) => {
		if (!selectedDataset) {
			alert("Please select a dataset");
			return;
		}
		try {
			let body = insightOptions[insight];
			console.log(body);
			const response = await fetch(`http://localhost:4321/query`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});
			if (response.ok) {
				const data = await response.json();
				console.log(data);
				if (data.result && Array.isArray(data.result)) {
					if (insight === "passRate") {
					const processedData = {
						labels: data.result.map(item => item[`${selectedDataset}_id`]),
						datasets: [
							{
								label: 'Average Pass Rate',
								data: data.result.map(item => ((item.avgPass)/parseFloat(item.avgPass + item.avgFail + item.avgAudit)) * 100),
								backgroundColor: 'rgba(75, 192, 192, 0.6)',
								borderColor: 'rgba(75, 192, 192, 1)',
								borderWidth: 1,
								barThickness: 'flex',
								maxBarThickness: 50,
							},
						],
					};
					setChartData({
						...processedData,
						options: {
							indexAxis: 'y',
						},
					});
				} else if (insight === "profAverage") {
					const processedData = {
						labels: data.result
							.filter(item => item[`${selectedDataset}_instructor`].trim() !== "")
							.map(item => {
								const [lastName, firstName] = item[`${selectedDataset}_instructor`].split(", ");
								return `${firstName} ${lastName}`;
							}),
						datasets: [
							{
								label: 'Professor Average',
								data: data.result
									.filter(item => item[`${selectedDataset}_instructor`].trim() !== "")
									.map(item => item.overallAvg),
								backgroundColor: 'rgba(75, 192, 192, 0.6)',
								borderColor: 'rgba(75, 192, 192, 1)',
								borderWidth: 1,
								barThickness: 'flex',
								maxBarThickness: 50,
							},
						],
					};
					setChartData({
						...processedData,
						options: {
							indexAxis: 'y',
						},
					});
				} else if (insight === "courseAverage") {
					const processedData = {
						labels: data.result.map(item => item[`${selectedDataset}_year`]),
						datasets: [
							{
								label: 'Course Average',
								data: data.result.map(item => item.overallAvg),
								backgroundColor: 'rgba(75, 192, 192, 0.6)',
								borderColor: 'rgba(75, 192, 192, 1)',
								borderWidth: 1,
								barThickness: 'flex',
								maxBarThickness: 50,
							},
						],
					};
					setChartData({
						...processedData,
						options: {
							indexAxis: 'y',
						},
					});
				}
			} else {
				alert("Failed to fetch insight");
			}
		}
		} catch (err) {
			alert(`Something went wrong ${err}`);
		}
	};

	const handleSelectChange = (event) => {
        setSelectedValue(event.target.value);
    };

	return (
		<Box className="dataset-insight" m={"10"} width="80%" p={"5"}>
			<Heading as="h2" size="lg">Dataset Insights</Heading>
			{selectedDataset ? <Heading as="h3" size="md">Selected Dataset: {selectedDataset}</Heading> : null}
			<FormControl>
				<FormLabel m="5px">Select a Dataset Insight</FormLabel>
				<Select m="5px" value={selectedValue} onChange={handleSelectChange}>
					<option value="passRate">Pass rate for each course filtered by department</option>
					<option value="profAverage">Average for each professor for a course</option>
					<option value="courseAverage">Average over the years for a course</option>
				</Select>

				<FormControl p={"5"}>
					<FormLabel>Department</FormLabel>
					<Input value={dept} type="text" placeholder="Enter department" onChange={(e) => setDept(e.target.value)} />
				</FormControl>
				{(selectedValue === "profAverage" || selectedValue === "courseAverage") &&
					<FormControl p={"5"}>
						<FormLabel>Course</FormLabel>
						<Input value={course} type="text" placeholder="Enter course" onChange={(e) => setCourse(e.target.value)} />
					</FormControl>
				}
			</FormControl>
			<Box display="flex" justifyContent="center" m="5px">
				<Button onClick={() => queryInsight(selectedValue)}>Generate Insights</Button>
			</Box>
			{chartData && (
				<Box width="100%" height="100%" mt="5">
					<Bar width="100%" height="50%" data={chartData} />
				</Box>
			)}
		</Box>
	);
}

export default InsightCard;
