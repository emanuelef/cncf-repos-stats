import React, { useState, useEffect } from "react";
import { ResponsiveTreeMap } from "@nivo/treemap";

const GitHubURL = "https://github.com/";

let testTreeMapData = {
  name: "CNCF",
  color: "hsl(146, 70%, 50%)",
  children: [],
};

function TreeMapChart({ dataRows }) {
  const [treeMapData, setTreeMapData] = useState({});

  const loadData = async () => {
    console.log(dataRows);

    testTreeMapData.children = [];

    dataRows.forEach(
      (element: { status: string, repo: string, stars: string }) => {
        const catStatus = testTreeMapData.children.find(
          (category) => category.name === element.status
        );

        if (!element.repo) {
          return;
        }

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
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="chart-container">
      <div style={{ height: 700, width: 1400, backgroundColor: "azure" }}>
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
    </div>
  );
}

export default TreeMapChart;
