import React from "react";
import Plot from "react-plotly.js";

const mapCategoryToColor = (category) => {
  const colorMappings = {
    Sandbox: "rgb(93, 164, 214)",
    Archived: "rgb(255, 144, 14)",
    Incubating: "rgb(44, 160, 101)",
    Graduated: "rgb(244, 60, 101)",
  };

  // Return the color for the given category, or a default color if not found
  return colorMappings[category] || "rgb(0, 0, 0)"; // Default to black if not found
};

const BubbleChart = ({ dataRows }) => {
  const handleBubbleClick = (event) => {
    // Extract information about the clicked point from the event
    console.log(event);
    const pointIndex = event.points[0].pointIndex;
    const clickedRepo = event.points[0].data.text[pointIndex];

    // Replace this with the URL or action you want to perform
    const url = `https://github.com/${clickedRepo}`;
    window.open(url, "_blank");
  };

  console.log(dataRows);

  const categories = ["Sandbox", "Archived", "Incubating", "Graduated"];
  const data = [];

  categories.forEach((category) => {
    const trace = {
      x: dataRows
        .filter((row) => row["status"] === category)
        .map((row) => row["new-stars-last-14d"]),
      y: dataRows
        .filter((row) => row["status"] === category)
        .map((row) => row["mentionable-users"]),
      text: dataRows
        .filter((row) => row["status"] === category)
        .map((row) => row.repo),
      mode: "markers",
      marker: {
        size: dataRows
          .filter((row) => row["status"] === category)
          .map((row) => Math.log(row["stars"])),
        sizemode: "diameter",
        sizeref: 0.22,
        color: mapCategoryToColor(category),
      },
      type: "scatter",
      name: category,
    };

    data.push(trace);
  });

  const layout = {
    xaxis: { type: "log", title: "New Stars Last 14 Days" },
    yaxis: { type: "log", title: "Mentionable Users" },
    size: "stars",
    color: "main-category",
    hovermode: "closest",
    hover_name: "repo",
    showlegend: true,
    title: "CNCF Bubble Chart",
    autosize: true,
    height: 800,
    width: 1200,
  };

  return (
    <div className="App" style={{ width: "800px", height: "600px" }}>
      <Plot
        data={data}
        layout={layout}
        onClick={(event) => handleBubbleClick(event)}
      />
    </div>
  );
};

export default BubbleChart;
