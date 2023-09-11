import { useState, useEffect } from "react";
// @ts-ignore
import Papa from "papaparse";
import "./App.css";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Link from "@mui/material/Link";
import { ResponsiveTreeMap } from "@nivo/treemap";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import TimeSeriesChart from "./TimeSeriesChart";

/*
archived
"false"
days-last-commit
"151"
days-last-star
"5"
days-since-creation
"3961"
dependencies
"5"
language
"Go"
mentionable-users
"8"
new-stars-last-7d
"1"
new-stars-last-14d
"5"
new-stars-last-24H
"0"
new-stars-last-30d
"7"
repo
"mewkiz/flac"
stars
"262"
stars-per-mille-30d
"26.718"*/

const GitHubURL = "https://github.com/";

const csvURL =
  "https://raw.githubusercontent.com/emanuelef/cncf-repos-stats/main/analysis-latest.csv";

const columns: GridColDef[] = [
  {
    field: "repo",
    headerName: "Repo",
    width: 200,
    renderCell: (params) => (
      <Link href={GitHubURL + params.value} target="_blank">
        {params.value}
      </Link>
    ),
  },
  {
    field: "stars",
    headerName: "Stars",
    width: 130,
    valueGetter: (val) => parseInt(val.row["stars"]),
  },
  {
    field: "days-last-star",
    headerName: "Days last star",
    width: 130,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "days-last-commit",
    headerName: "Days last commit",
    width: 130,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "new-stars-last-30d",
    headerName: "Stars last 30d",
    width: 110,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "new-stars-last-7d",
    headerName: "Stars last 7d",
    width: 110,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "stars-per-mille-30d",
    headerName: "New Stars 30d ‰",
    width: 130,
    valueGetter: (val) => parseFloat(val.row["stars-per-mille-30d"]),
  },
  {
    field: "mentionable-users",
    headerName: "Ment. users",
    width: 110,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "dependencies",
    headerName: "Direct deps",
    width: 130,
    valueGetter: (val) => parseInt(val.row["dependencies"]),
  },
  {
    field: "status",
    headerName: "Status",
    width: 110,
  },
  {
    field: "archived",
    headerName: "Archived",
    width: 110,
  },
];

// https://raw.githubusercontent.com/emanuelef/awesome-go-repo-stats/main/analysis-latest.csv

let testTreeMapData = {
  name: "cncf",
  color: "hsl(146, 70%, 50%)",
  children: [],
};

function App() {
  const fetchStats = () => {
    fetch(csvURL)
      .then((response) => response.text())
      .then((text) => Papa.parse(text, { header: true }))
      .then(function (result) {
        setDataRows(result.data);
        console.log(result.data);

        testTreeMapData.children = [];

        result.data.forEach(
          (element: { status: string; repo: string; stars: string }) => {
            const catStatus = testTreeMapData.children.find(
              (category) => category.name === element.status
            );

            if (!catStatus) {
              testTreeMapData.children.push({
                name: element.status,
                children: [],
              });
            } else {
              catStatus.children.push({
                name: element.repo,
                stars: parseInt(element.stars),
              });
            }
          }
        );

        console.log(testTreeMapData);
        setTreeMapData(testTreeMapData);
      })
      .catch((e) => {
        console.error(`An error occurred: ${e}`);
      });
  };

  const [dataRows, setDataRows] = useState([]);
  const [treeMapData, setTreeMapData] = useState({});

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div style={{ height: 800, width: 1440, backgroundColor: "azure" }}>
      <Link href={csvURL} download>
        Link
      </Link>
      <DataGrid
        getRowId={(row) => row.repo}
        rows={dataRows}
        columns={columns}
        rowHeight={30}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 50 },
          },
          sorting: {
            sortModel: [{ field: "stars-per-mille-30d", sort: "desc" }],
          },
        }}
        pageSizeOptions={[5, 10, 50]}
      />
      <div style={{ height: 800, width: 1440, backgroundColor: "azure" }}>
        <ResponsiveTreeMap
          data={treeMapData}
          identity="name"
          value="stars"
          valueFormat=".03s"
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
      <TimeSeriesChart />
    </div>
  );
}

export default App;
