
import React from "react";



// Helper: Calculate trend
const calculateTrend = (currentCount: any, previousCount: any) => {
  if (previousCount === undefined) return { trend: "neutral", trendValue: 0 };
  if (currentCount > previousCount) return { trend: "up", trendValue: currentCount - previousCount };
  if (currentCount < previousCount) return { trend: "down", trendValue: previousCount - currentCount };
  return { trend: "neutral", trendValue: 0 };
};

const getSeverity = (count: number, total: number) => {
  if (!total || count === 0) return "Info";
  const percentage = (count / total) * 100;

  if (percentage >= 20) return "Critical";
  if (percentage >= 10) return "Medium";
  if (percentage >= 1) return "Low";
  return "Low";
};



export const extractTopIssues = (historyData: any) => {
  if (!historyData || historyData.length === 0) return [];

  const latest = historyData?.[0]?.result?.grouped_issues || [];
  const previous = historyData?.[1]?.result?.grouped_issues || {};

  const issues: any[] = [];

  const showIssueType = (issue_type: any) => {
    switch (issue_type) {
      // case "Broken Internal Links":
      //     return "Broken Internal Links"
      // case "Schema Markup Issues":
      //     return "Schema Markup Issues"
      case "Missing Alt Text":
        return "Image Missing Alt Issues"
      case "Security Issues":
        return "Non Secure Page (No HTTPS, malware phishing)"
      // case "Missing H1 Tags":
      //     return "Missing H1 Tag"
      case "Mixed Content":
        return "Mixed Content (HTTPS with HTTP)"
      // case "Meta Description Issues":
      //     return "Meta Description Issues"
      case "5xx Server Error":
        return "5xx Server Error"
      default:
        return issue_type
    }
  }


  const expectedIssues = [
    "Broken Internal Links",
    "Schema Markup Issues",
    "Missing Alt Text",
    "Security Issues",
    "Meta Title Issues",
    "Robots.txt Missing",
    "Missing H1 Tags",
    "Mixed Content",
    "Meta Description Issues",
    "5xx Server Error",
  ];

  const pushIssue = (id: number, type: string, count: number, severity: any, affectedPages: number, trend: any) => {
    issues.push({
      id,
      type: showIssueType(type),
      count,
      severity,
      affectedPages,
      trend
    });
  };

  expectedIssues.forEach((type, index) => {
    const current = latest?.length > 0 && latest?.find((issue: any) => issue.issue_type === type);
    const previousData = previous?.length > 0 && previous?.find((issue: any) => issue.issue_type === type);
    pushIssue(index + 1, type, current?.instances ? current?.instances : 0, current?.severity ? current.severity.replace(/^[^\w]*\s*/, '') : "Low", current?.pages_affected ? current?.pages_affected : 0,
      calculateTrend(current?.instances ? current?.instances : 0, previousData?.instances ? previousData?.instances : 0)
    );
  });

  return issues;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}, ${date.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })} GMT`;
};

export const formatDateYear = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
};

export const formatUnit = (unit: string) => {
  if (unit?.toLowerCase().includes('millisecond')) return 'ms';
  if (unit?.toLowerCase().includes('second')) return 's';
  return unit;
};


export const Employseries = [
  {
    data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 53, 53, 61, 27, 54, 43, 19, 46],
  },
]
export const Employoptions: any = ({ color, gradientcolor }: any) => ({
  chart: {
    type: 'area',
    height: 50,
    sparkline: {
      enabled: true,
    },
    dropShadow: {
      enabled: true,
      enabledOnSeries: undefined,
      top: 0,
      left: 0,
      blur: 3,
      color: [color],
      opacity: 0.4,
    },
  },
  stroke: {
    curve: 'straight',
    width: [1],
  },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.5,
      opacityTo: 0.2,
      stops: [0, 60],
      colorStops: [
        [
          {
            offset: 0,
            color: gradientcolor,
            opacity: 0.3
          },
          {
            offset: 60,
            color: gradientcolor,
            opacity: 0.3
          }
        ],
      ]
    },
  },
  colors: [color],
  tooltip: {
    fixed: {
      enabled: false,
    },
    x: {
      show: false,
    },
    y: {
      title: {
        formatter: function (seriesName: any) {
          return "";
        },
      },
    },
  },

})


const generateDayWiseTimeSeries = function (baseval: number, count: number, yrange: { min: any; max: any; }) {
  let i = 0;
  const series: any[] = [];
  while (i < count) {
    const x = baseval;
    const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;
    series.push([x, y]);
    baseval += 86400000;
    i++;
  }
  return series;
};


export const getAreastackSeries = (summary: any,createdAtDate:any) => [
  {
    name: "Indexed",
    data: [[new Date(createdAtDate).getTime(), summary?.indexed_urls ?? 0]]
  },
  {
    name: "Excluded",
    data: [[new Date(createdAtDate).getTime(), summary?.excluded_urls ?? 0]]
  },
  {
    name: "Error",
    data: [[new Date(createdAtDate).getTime(), summary?.errors_indexing ?? 0]]
  },
  {
    name: "Warning",
    data: [[new Date(createdAtDate).getTime(), summary?.valid_with_warnings ?? 0]]
  }
];



export const Areastackoptions = {
  chart: {
    type: "area",
    height: 350,
    stacked: true,
    toolbar: {
      show: false
    },
    events: {
      selection: function (_chart: any, e: { xaxis: { min: string | number | Date; }; }) {
        console.log(new Date(e.xaxis.min));
      },
      mounted: (chart: { windowResizeHandler: () => void; }) => {
        chart.windowResizeHandler();
      }
    },
  },
  colors: ['#10B981', '#F9BB04', '#E94134', "#F97316"],
  grid: {
    borderColor: "#f2f5f7",
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: "smooth",
    width: 2
  },
  fill: {
    type: "solid",
    opacity: 0 

  },
  legend: {
    position: "top",
    horizontalAlign: "left"
  },
  xaxis: {
    type: "datetime"
  },
}

  // #10B981 green -> light : #10B9814D
  // #4286F5 blue -> light : #4286F54D
  // #F9BB04 yellow -> light : #F9BB04
  // #E94134 red -> light :
  // #F97316 warning -> light :
  // #A76AFC purpal -> light :
  // #EE3EA5 pink -> light :
  // #9A6606 gray -> light :
  ;

export function splitAndRenderMultipleLinksNoJSX(text = "") {
  const segments = text.split("(");
  const nodes: any = [];

  segments.forEach((segment, index) => {
    if (index === 0) {
      nodes.push(segment);
      return;
    }

    const closingParenIndex = segment.indexOf(")");
    if (closingParenIndex === -1) {
      nodes.push("(" + segment);
      return;
    }

    const possibleUrl = segment.slice(0, closingParenIndex).trim();
    const afterText = segment.slice(closingParenIndex + 1);

    if (possibleUrl.startsWith("http://") || possibleUrl.startsWith("https://")) {
      nodes.push("(");
      nodes.push(
        React.createElement(
          "a",
          {
            key: `link-${index}-${possibleUrl}`,
            href: possibleUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: `
              text-[#0077FF] 
              font-normal text-[15px] leading-[20px] 
              underline decoration-solid
              break-words sm:break-normal 
              inline-block
              cursor-pointer
            `,
          },
          possibleUrl
        )
      );
      nodes.push(")");
      if (afterText) nodes.push(afterText);
    } else {
      nodes.push("(" + segment);
    }
  });

  return nodes;
}


export const formatTypeLabel = (type: string) => {
  return type
    .replace(/_/g, " ") // replace underscores with spaces
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)); // Title Case
}


export const ISSUE_LABEL_TO_KEY: Record<string, string> = {
  "Broken Internal Links": "broken_link_issues",
  "Schema Markup Issues": "schema_issues",
  "Image Missing Alt Issues": "image_alt_issues",
  "Missing Alt Text": "image_alt_issues",
  "Missing H1 Tags": "heading_suggestions",
  "Meta Description Issues": "meta_description_suggestions",
  "Mixed Content (HTTPS with HTTP)": "mixed_content_issues",
  "Mixed Content": "mixed_content_issues",
  "Security Issues": "security_insights",
  "Non Secure Page (No HTTPS, malware phishing)": "security_insights",
  "5xx Server Error": "5xx_links",
  "5xx Server Errors": "5xx_links",
  "Meta Title Issues": "title_suggestions",
  "Robots Meta Issues": "robots_suggestions",
  "Robots.txt Missing": "sitemap_robots_issues",
  "Sitemap Missing": "sitemap_robots_issues",
};

export function toIssueKeyStrict(input: unknown): string | null {
  if (!input || typeof input !== "string") return null;
  if (ISSUE_LABEL_TO_KEY[input]) return ISSUE_LABEL_TO_KEY[input];  // exact label hit
  // If the upstream already passed a key, accept it only if it’s one of our known keys
  if (Object.values(ISSUE_LABEL_TO_KEY).includes(input)) return input;
  return null; // unknown → do not map; treat as invalid
}

export function normalizeForCompare(url: string): string {
  if (!url) return "";
  try {
    // If it’s absolute, URL() will parse host & path; if it’s a path, fallback below
    const u = new URL(url, "https://_dummy_base_");
    const pathname = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;
    const search = u.search || "";
    return (pathname || "/") + search;
  } catch {
    // relative or malformed → ensure consistent trimming & trailing slash handling
    const trimmed = url.trim();
    if (!trimmed.startsWith("/")) return "/" + trimmed.replace(/\/+$/, "");
    return trimmed.replace(/\/+$/, "");
  }
}




export const normalizeselectedProjectUrl = (url: string = "") => {
  try {
    return url.replace(/\/+$/, "")
  } catch {
    return url;
  }
};
