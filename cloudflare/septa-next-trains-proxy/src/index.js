const SEPTA_BASE_URL = "http://www3.septa.org/hackathon/NextToArrive/";
const SEPTA_TRAIN_VIEW_URL = "http://www3.septa.org/hackathon/TrainView/";
const SEPTA_ALERTS_URL = "http://www3.septa.org/hackathon/Alerts/index.php";

function stripHtml(value) {
  const text = (value || "").replace(/<[^>]+>/g, " ");
  const decoded = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function textResponse(message, status = 400) {
  return new Response(message, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/alerts") {
      return handleAlerts();
    }

    if (url.pathname !== "/api/next-trains") {
      return textResponse("Not found.", 404);
    }

    const origin = (url.searchParams.get("origin") || "").trim();
    const destination = (url.searchParams.get("destination") || "").trim();

    if (!origin || !destination) {
      return textResponse("Missing origin or destination.", 400);
    }

    const septaUrl = new URL(SEPTA_BASE_URL);
    septaUrl.searchParams.set("req1", origin);
    septaUrl.searchParams.set("req2", destination);
    septaUrl.searchParams.set("req3", "3");

    let nextToArriveResponse;
    try {
      [nextToArriveResponse] = await Promise.all([
        fetch(septaUrl.toString(), {
          headers: {
            Accept: "application/json",
            "User-Agent": "wallacedesign-next-trains-proxy",
          },
          cf: {
            cacheTtl: 0,
            cacheEverything: false,
          },
        }),
      ]);
    } catch (error) {
      return textResponse(`Could not reach the SEPTA API: ${error.message}`, 502);
    }

    if (!nextToArriveResponse.ok) {
      return textResponse(`SEPTA returned ${nextToArriveResponse.status}.`, 502);
    }

    let trains;
    try {
      trains = await nextToArriveResponse.json();
    } catch (_error) {
      return textResponse("SEPTA returned an unreadable response.", 502);
    }

    let trainViewEntries = [];
    try {
      const trainViewResponse = await fetch(SEPTA_TRAIN_VIEW_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "wallacedesign-next-trains-proxy",
        },
        cf: {
          cacheTtl: 0,
          cacheEverything: false,
        },
      });

      if (trainViewResponse.ok) {
        trainViewEntries = await trainViewResponse.json();
      }
    } catch (_error) {
      trainViewEntries = [];
    }

    const consistByTrain = new Map(
      trainViewEntries.map((entry) => [String(entry.trainno || "").trim(), entry.consist || ""])
    );

    const enrichedTrains = trains.map((train) => {
      const trainNumber = String(train.orig_train || train.trainno || "").trim();
      const consist = consistByTrain.get(trainNumber) || "";

      return {
        ...train,
        consist,
        car_count: consist ? consist.split(",").filter(Boolean).length : 0,
      };
    });

    return jsonResponse(enrichedTrains);
  },
};

async function handleAlerts() {
  const alertsUrl = new URL(SEPTA_ALERTS_URL);
  alertsUrl.searchParams.set("req2", "0");

  let response;
  try {
    response = await fetch(alertsUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "wallacedesign-next-trains-proxy",
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });
  } catch (error) {
    return textResponse(`Could not reach the SEPTA API: ${error.message}`, 502);
  }

  if (!response.ok) {
    return textResponse(`SEPTA returned ${response.status}.`, 502);
  }

  let entries;
  try {
    entries = await response.json();
  } catch (_error) {
    return textResponse("SEPTA returned an unreadable response.", 502);
  }

  const railAlerts = entries
    .filter((entry) => entry.mode === "Regional Rail")
    .map((entry) => ({
      route_id: entry.route_id || "",
      route_name: entry.route_name || "",
      description: entry.description || "",
      last_updated: entry.last_updated || "",
      isadvisory: entry.isadvisory || "N",
      isalert: entry.isalert || "N",
      isdetour: entry.isdetour || "N",
      isdelays: entry.isdelays || "N",
      isdiversion: entry.isdiversion || "N",
      issuspended: entry.issuspended || "N",
      ismodifiedservice: entry.ismodifiedservice || "N",
      isSnow: entry.isSnow || "N",
      iselevator: entry.iselevator || "N",
      alert: stripHtml(entry.alert),
      advisory: stripHtml(entry.advisory),
      elevator: Array.isArray(entry.elevator)
        ? entry.elevator.map((item) => ({
            message: stripHtml(item.message),
            updated: item.updated || "",
          }))
        : [],
    }));

  return jsonResponse(railAlerts);
}
