import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./App.css";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const GitHubURL = "https://github.com/";

const csvURL =
  "https://raw.githubusercontent.com/emanuelef/cncf-repos-stats/main/analysis-latest.csv";

const LanguageColoursURL =
  "https://raw.githubusercontent.com/ozh/github-colors/master/colors.json";

const ColumnChart = ({ dataRows }) => {
  const [data, setData] = useState([]);
  const [keys, setKeys] = useState([]);
  const [series, setSeries] = useState([]);

  const buildChartData = async (dataRows) => {
    const response = await fetch(LanguageColoursURL);
    const colours = await response.json();

    console.log(colours);

    let langData = {};
    let keysSet = new Set();
    let allLanguagesCount = {};

    dataRows.forEach((element) => {
      if (!element.repo || !element.language) {
        return;
      }

      keysSet.add(element.language);

      if (element.language in allLanguagesCount) {
        allLanguagesCount[element.language]++;
      } else {
        allLanguagesCount[element.language] = 1;
      }

      if (element.status in langData) {
        if (element.language in langData[element.status]) {
          langData[element.status][element.language]++;
        } else {
          langData[element.status][element.language] = 1;
        }
      } else {
        langData[element.status] = { [element.language]: 1 };
      }
    });

    const sorted_languages = Object.keys(allLanguagesCount).sort((a, b) => {
      return allLanguagesCount[a] - allLanguagesCount[b];
    });

    const allLanguageKeys = Array.from(keysSet);

    let AllSeries = [];

    for (const lang of sorted_languages) {
      let statusList = [];
      statusList.push(
        lang in langData["Graduated"] ? langData["Graduated"][lang] : 0
      );
      statusList.push(
        lang in langData["Incubating"] ? langData["Incubating"][lang] : 0
      );
      statusList.push(
        lang in langData["Sandbox"] ? langData["Sandbox"][lang] : 0
      );
      statusList.push(
        lang in langData["Archived"] ? langData["Archived"][lang] : 0
      );

      AllSeries.push({
        name: lang,
        data: statusList,
        color: lang in colours ? colours[lang].color : undefined,
      });
    }

    setSeries(AllSeries);

    setData(langData);
    setKeys(allLanguageKeys);
  };

  const loadData = async () => {
    if (dataRows.length == 0) {
      fetch(csvURL)
        .then((response) => response.text())
        .then((text) =>
          Papa.parse(text, { header: true, skipEmptyLines: true })
        )
        .then(function (result) {
          buildChartData(result.data);
        })
        .catch((e) => {
          console.error(`An error occurred: ${e}`);
        });
    } else {
      buildChartData(dataRows);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const options = {
    chart: {
      type: "column",
      height: "52%",
      backgroundColor: "#333333",
      textColor: "#dddddd",
    },
    title: {
      text: "CNCF Languages",
      style: {
        color: "#dddddd",
      },
    },
    xAxis: {
      categories: ["Graduated", "Incubating", "Sandbox", "Archived"],
      labels: {
        style: {
          color: "#dddddd",
        },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: "Total",
        style: {
          color: "#dddddd",
        },
      },
      stackLabels: {
        enabled: true,
        style: {
          color: "#dddddd",
        },
      },
      labels: {
        style: {
          color: "#dddddd",
        },
      },
      plotLines: [
        {
          color: "#dddddd", // Color of the line
          width: 2, // Width of the line
          value: 0, // Position on the axis
        },
      ],
    },
    legend: {
      reversed: true,
      itemStyle: {
        color: "#dddddd",
      },
    },
    plotOptions: {
      column: {
        stacking: "normal",
        animation: false,
        dataLabels: {
          enabled: true,
          style: {
            color: "#dddddd",
          },
        },
      },
    },
    series: series,
  };

  return (
    <div
      style={{
        marginLeft: "10px",
        marginTop: "10px",
        marginRight: "10px",
        height: "90%",
      }}
    >
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default ColumnChart;
