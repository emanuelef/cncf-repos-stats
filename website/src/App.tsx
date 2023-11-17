import { useState, useEffect } from "react";
// @ts-ignore
import Papa from "papaparse";
import "./App.css";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Linkweb from "@mui/material/Link";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import TimeSeriesChart from "./TimeSeriesChart";
import DepsChart from "./DepsChart";
import LangHCBarChart from "./LangHCBarChart";
import BubbleChart from "./BubbleChart";
import TreeMapChart from "./TreeMapChart";
import GitHubButton from "react-github-btn";

import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Routes, Route, Link, useParams, useNavigate } from "react-router-dom";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import ViewQuiltRounded from "@mui/icons-material/ViewQuiltRounded";
import BubbleChartRoundedIcon from "@mui/icons-material/BubbleChartRounded";
import { Share } from "@mui/icons-material";

import Header from "./Header";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

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

const lastUpdateURL =
  "https://raw.githubusercontent.com/emanuelef/cncf-repos-stats/main/last-update.txt";

const fullStarsHistoryURL =
  "https://emanuelef.github.io/gh-repo-stats-server/#/";

const ShareableLink = ({ repo }) => {
  return <Link to={`/starstimeline/${encodeURIComponent(repo)}`}>{repo}</Link>;
};

const columns: GridColDef[] = [
  {
    field: "repo",
    headerName: "Repo",
    width: 200,
    renderCell: (params) => (
      <Linkweb href={GitHubURL + params.value} target="_blank">
        {params.value}
      </Linkweb>
    ),
  },
  {
    field: "stars",
    headerName: "Stars",
    width: 90,
    valueGetter: (val) => parseInt(val.row["stars"]),
  },
  {
    field: "days-last-star",
    headerName: "Days last star",
    width: 100,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "days-last-commit",
    headerName: "Days last commit",
    width: 110,
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
    width: 100,
    valueGetter: (params) => parseInt(params.value),
  },
  {
    field: "language",
    headerName: "Lang.",
    width: 110,
  },
  {
    field: "dependencies",
    headerName: "Direct deps",
    width: 90,
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
    width: 90,
    renderCell: (params) => (
      <span style={{ color: params.value === "true" ? "red" : "inherit" }}>
        {params.value}
      </span>
    ),
  },
  {
    headerName: "Stars Timeline 30d",
    width: 110,
    renderCell: (params) => (
      <Linkweb href={`./#/starstimeline/${params.row.repo}`}>link</Linkweb>
    ),
  },
];

function App() {
  const fetchStats = () => {
    fetch(csvURL)
      .then((response) => response.text())
      .then((text) => Papa.parse(text, { header: true, skipEmptyLines: true }))
      .then(function (result) {
        setDataRows(result.data);
      })
      .catch((e) => {
        console.error(`An error occurred: ${e}`);
      });
  };

  const fetchLastUpdate = () => {
    fetch(lastUpdateURL)
      .then((response) => response.text())
      .then(function (dateString) {
        console.log(dateString);
        const parts = dateString.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Months are 0-indexed
          const day = parseInt(parts[2]);
          const options = { year: "numeric", month: "long", day: "numeric" };
          const formattedDate = new Date(year, month, day).toLocaleDateString(
            "en-US",
            options
          );
          setLastUpdate(formattedDate);
        }
      })
      .catch((e) => {
        console.error(`An error occurred: ${e}`);
      });
  };

  const [dataRows, setDataRows] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("kubernetes/kubernetes");
  const [collapsed, setCollapsed] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("Unknown");

  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchLastUpdate();
  }, []);

  const Table = () => {
    return (
      <div style={{ marginLeft: "10px", marginRight: "90px", height: "86%" }}>
        <DataGrid
          getRowId={(row) => row.repo}
          rows={dataRows}
          columns={columns}
          rowHeight={30}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
            sorting: {
              sortModel: [{ field: "stars-per-mille-30d", sort: "desc" }],
            },
          }}
          pageSizeOptions={[5, 10, 50]}
        />
      </div>
    );
  };

  const StarsTimeline = () => {
    const { user, repository } = useParams();

    useEffect(() => {
      console.log(user + "/" + repository);
      setSelectedRepo(user + "/" + repository);
    }, []);

    return (
      <>
        <div
          style={{ display: "flex", alignItems: "center", marginTop: "10px" }}
        >
          <Autocomplete
            disablePortal
            id="combo-box-demo"
            size="small"
            options={dataRows.map((el) => {
              return { label: el.repo };
            })}
            renderInput={(params) => (
              <TextField
                {...params}
                style={{
                  marginRight: "20px",
                  marginLeft: "10px",
                  width: "400px",
                }}
                label="Enter a GitHub repository"
                variant="outlined"
                size="small"
              />
            )}
            value={selectedRepo}
            onChange={(e, v, reason) => {
              if (reason === "clear") {
                setSelectedRepo("kubernetes/kubernetes");
                navigate(`/starstimeline/kubernetes/kubernetes`, {
                  replace: false,
                });
              } else {
                setSelectedRepo(v?.label);
                navigate(`/starstimeline/${v?.label}`, {
                  replace: false,
                });
              }
            }}
            onBlur={() => {
              navigate(`/starstimeline/kubernetes/kubernetes}`, {
                replace: false,
              });
            }}
            clearOnBlur={false}
            clearOnEscape
            onClear={() => {
              navigate(`/starstimeline/kubernetes/kubernetes}`, {
                replace: false,
              });
            }}
          />
          <GitHubButton
            href={"https://github.com/" + selectedRepo}
            data-color-scheme="no-preference: dark; light: dark_dimmed; dark: dark_high_contrast;"
            data-size="large"
            data-show-count="true"
            aria-label="Star buttons/github-buttons on GitHub"
          >
            Star
          </GitHubButton>
          <Linkweb
            style={{ marginLeft: "10px" }}
            href={fullStarsHistoryURL + selectedRepo}
            target="_blank"
          >
            Full Stars History
          </Linkweb>
        </div>
        <TimeSeriesChart repo={selectedRepo} />
      </>
    );
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar
          className="app"
          collapsed={collapsed}
          backgroundColor="rgb(51, 117, 117)"
        >
          <Menu
            menuItemStyles={{
              button: ({ level, active, disabled }) => {
                if (level >= 0)
                  return {
                    color: disabled ? "#f5d9ff" : "#07100d",
                    backgroundColor: active ? "#00cef9" : "undefined",
                  };
              },
            }}
          >
            <MenuItem
              component={<Link to="/" className="link" />}
              className="menu1"
              icon={
                <MenuRoundedIcon
                  onClick={() => {
                    setCollapsed(!collapsed);
                  }}
                />
              }
            >
              <h2 style={{ color: "black" }}>CNCF Stats</h2>
            </MenuItem>
            <MenuItem
              component={<Link to="/table" className="link" />}
              icon={<ViewListRoundedIcon />}
            >
              Table
            </MenuItem>
            <MenuItem
              component={<Link to="/treemap" className="link" />}
              icon={<ViewQuiltRounded />}
            >
              Treemap
            </MenuItem>
            <MenuItem
              component={
                <Link
                  to="/starstimeline/kubernetes/kubernetes"
                  className="link"
                />
              }
              icon={<TimelineRoundedIcon />}
            >
              StarsTimeline
            </MenuItem>
            <MenuItem
              component={<Link to="/deps" className="link" />}
              icon={<LibraryBooksRoundedIcon />}
            >
              DepsChartTable
            </MenuItem>
            <MenuItem
              component={<Link to="/langHC" className="link" />}
              icon={<BarChartRoundedIcon />}
            >
              Languages
            </MenuItem>
            <MenuItem
              component={<Link to="/bubble" className="link" />}
              icon={<BubbleChartRoundedIcon />}
            >
              Bubble
            </MenuItem>
          </Menu>
        </Sidebar>
        <section style={{ width: "100%" }}>
          <Header lastUpdate={lastUpdate} />
          <Routes>
            <Route path="/" element={<Table />} />
            <Route path="/table" element={<Table />} />
            <Route
              path="/treemap"
              element={<TreeMapChart dataRows={dataRows} />}
            />
            <Route
              path="/starstimeline/:user/:repository"
              element={<StarsTimeline />}
            />
            <Route path="/deps" element={<DepsChart />} />
            <Route
              path="/langHC"
              element={<LangHCBarChart dataRows={dataRows} />}
            />
            <Route
              path="/bubble"
              element={<BubbleChart dataRows={dataRows} />}
            />
          </Routes>
        </section>
      </div>
    </ThemeProvider>
  );
}

export default App;
