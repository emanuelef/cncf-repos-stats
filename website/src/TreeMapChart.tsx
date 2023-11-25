import React, { useState, useEffect } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Papa from "papaparse";
import { ResponsiveTreeMap } from "@nivo/treemap";

const GitHubURL = "https://github.com/";

const metricsList = [
  { label: "Total Stars", metric: "stars" },
  { label: "Last 7d stars", metric: "new-stars-last-7d" },
  { label: "Last 14d stars", metric: "new-stars-last-14d" },
  { label: "Last 30d stars", metric: "new-stars-last-30d" },
  { label: "Commits last 30d", metric: "mentionable-users" },
  { label: "Unique Authors 30d", metric: "unique-contributors" },
];

const csvURL =
  "https://raw.githubusercontent.com/emanuelef/cncf-repos-stats/main/analysis-latest.csv";

function TreeMapChart({ dataRows }) {
  const [treeMapData, setTreeMapData] = useState({});
  const [selectedMetric, setSelectedMetric] = useState(metricsList[0].metric);

  const buildTreeData = (dataRows) => {
    console.log(selectedMetric);

    const newTreeMapData = {
      name: "CNCF",
      color: "hsl(146, 70%, 50%)",
      children: [],
    };

    newTreeMapData.children = [];

    dataRows.forEach(
      (element: { status: string; repo: string; stars: string }) => {
        const catStatus = newTreeMapData.children.find(
          (category) => category.name === element.status
        );

        if (!element.repo) {
          return;
        }

        if (!catStatus) {
          newTreeMapData.children.push({
            name: element.status,
            children: [],
          });
        } else {
          catStatus.children.push({
            name: element.repo,
            stars: parseInt(element[selectedMetric]),
          });
        }
      }
    );

    console.log(newTreeMapData);
    setTreeMapData(newTreeMapData);
  };

  const loadData = async () => {
    if (dataRows.length == 0) {
      fetch(csvURL)
        .then((response) => response.text())
        .then((text) =>
          Papa.parse(text, { header: true, skipEmptyLines: true })
        )
        .then(function (result) {
          buildTreeData(result.data);
        })
        .catch((e) => {
          console.error(`An error occurred: ${e}`);
        });
    } else {
      buildTreeData(dataRows);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMetric]);

  return (
    <div
      className="chart-container"
      style={{ marginTop: "10px", marginLeft: "10px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "10px",
          marginBottom: "10px",
        }}
      >
        <Autocomplete
          disablePortal
          id="treemap-combo-box"
          size="small"
          options={metricsList}
          sx={{ width: 300 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select a metric"
              variant="outlined"
              size="small"
            />
          )}
          value={
            metricsList.find((element) => element.metric === selectedMetric) ??
            ""
          }
          onChange={(e, v, reason) => {
            if (reason === "clear") {
              setSelectedMetric(metricsList[0].metric);
            } else {
              setSelectedMetric(v?.metric);
            }
          }}
        />
      </div>
      <div style={{ height: "84%", width: "96%", backgroundColor: "azure" }}>
        <ResponsiveTreeMap
          data={treeMapData}
          identity="name"
          value="stars"
          valueFormat=".03s"
          margin={{ top: 10, right: 10, bottom: 10 }}
          labelSkipSize={12}
          labelTextColor={{
            from: "color",
            modifiers: [["darker", 1.2]],
          }}
          parentLabelPosition="top"
          parentLabelTextColor={{
            from: "color",
            modifiers: [["darker", 2]],
          }}
          borderColor={{
            from: "color",
            modifiers: [["darker", 0.1]],
          }}
          animate={false}
          tooltip={({ node }) => (
            <strong style={{ color: "black", backgroundColor: "white" }}>
              {node.pathComponents.join(" - ")}: {node.formattedValue}
            </strong>
          )}
          onClick={(data) => {
            window.open(GitHubURL + data.id, "_blank");
          }}
        />
      </div>
    </div>
  );
}

export default TreeMapChart;
