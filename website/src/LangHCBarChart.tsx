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

    console.log(langData);

    const sorted_languages = Object.keys(allLanguagesCount).sort((a, b) => {
      return allLanguagesCount[a] - allLanguagesCount[b];
    });

    console.log(allLanguagesCount);
    console.log(sorted_languages);

    const allLanguageKeys = Array.from(keysSet);

    let AllSeries = [];

    for (const lang of sorted_languages) {
      console.log(lang);

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

    console.log(AllSeries);

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
      height: 760,
    },
    title: {
      text: "CNCF Languages",
    },
    xAxis: {
      categories: ["Graduated", "Incubating", "Sandbox", "Archived"],
    },
    yAxis: {
      min: 0,
      title: {
        text: "Total",
      },
      stackLabels: {
        enabled: true,
      },
    },
    legend: {
      reversed: true,
    },
    plotOptions: {
      column: {
        stacking: "normal",
        animation: false,
        dataLabels: {
          enabled: true,
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
