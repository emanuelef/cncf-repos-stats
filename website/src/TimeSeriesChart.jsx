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
              value: "Stars",
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

const CSVToArray = (data, delimiter = ",", omitFirstRow = false) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => v.split(delimiter));

function TimeSeriesChart() {
  const [ds, setds] = useState(chart_props);
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      const fusionTable = new FusionCharts.DataStore().createDataTable(
        data["kubernetes/kubernetes"],
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
