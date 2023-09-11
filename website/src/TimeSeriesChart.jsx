import React, { useState, useEffect, useCallback } from "react";
import FusionCharts from "fusioncharts";
import TimeSeries from "fusioncharts/fusioncharts.timeseries";
import ReactFC from "react-fusioncharts";
import schema from "./schema";

ReactFC.fcRoot(FusionCharts, TimeSeries);
const chart_props = {
  timeseriesDs: {
    type: "timeseries",
    width: "1200",
    height: "800",
    dataEmptyMessage: "Fetching data...",
    dataSource: {
      caption: { text: "New stars per day" },
      data: null,
      yAxis: [
        {
          plot: [
            {
              value: "New Stars",
            },
          ],
        },
      ],
    },
  },
};
const API_URL =
  "https://raw.githubusercontent.com/emanuelef/cncf-repos-stats/main/stars-history-30d.json";

const FULL_URL_CSV =
  "https://raw.githubusercontent.com/emanuelef/github-repo-activity-stats/main/all-stars-k8s.csv";

const CSVToArray = (data, delimiter = ",", omitFirstRow = true) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => {
      let arr = v.split(delimiter);
      arr[1] = parseInt(arr[1]);
      arr[2] = parseInt(arr[2]);
      return arr;
    });

const movingAvg = (array, countBefore, countAfter = 0) => {
  const result = [];
  for (let i = 0; i < array.length; i++) {
    const subArr = array.slice(
      Math.max(i - countBefore, 0),
      Math.min(i + countAfter + 1, array.length)
    );
    const avg =
      subArr.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0) / subArr.length;
    result.push(avg);
  }
  return result;
};

function TimeSeriesChart() {
  const [ds, setds] = useState(chart_props);
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(FULL_URL_CSV);
      const res = await response.text();
      const data = CSVToArray(res);
      console.log(data);

      let calcMovingAvg = data.map((el) => {
        return el[1];
      });
      calcMovingAvg = movingAvg(calcMovingAvg, 6, 6);

      const movingAverageData = data.map((el, index) => {
        el[1] = calcMovingAvg[index];
        return el;
      });

      console.log(movingAverageData);

      const fusionTable = new FusionCharts.DataStore().createDataTable(
        movingAverageData,
        schema
      );
      const options = { ...ds };
      options.timeseriesDs.dataSource.data = fusionTable;
      setds(options);
    } catch (err) {
      console.log(err);
    }
  }, []);

  useEffect(() => {
    console.log("render");
    loadData();
  }, [loadData]);

  return (
    <div>
      <ReactFC {...ds.timeseriesDs} />
    </div>
  );
}

export default TimeSeriesChart;
