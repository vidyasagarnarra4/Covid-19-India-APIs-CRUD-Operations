const express = require("express");
const app = express();

const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state;`;
  const statesList = await db.all(getStatesQuery);
  const formattedStatesList = statesList.map((eachState) =>
    convertDbObjectToResponseObject(eachState)
  );
  response.send(formattedStatesList);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getOneStateQuery = `SELECT * FROM state WHERE state_id = ${stateId}`;
  const oneState = await db.get(getOneStateQuery);
  const formattedOneStateQuery = convertDbObjectToResponseObject(oneState);
  response.send(formattedOneStateQuery);
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
        INSERT INTO district(
            district_name,
            state_id,
            cases,
            cured,
            active,
            deaths
        )
        VALUES(
            "${districtName}",
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths}
        );
    `;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getOneDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId}`;
  const districtDbObject = await db.get(getOneDistrictQuery);
  const formattedDistrictObject = {
    districtId: districtDbObject.district_id,
    districtName: districtDbObject.district_name,
    stateId: districtDbObject.state_id,
    cases: districtDbObject.cases,
    cured: districtDbObject.cured,
    active: districtDbObject.active,
    deaths: districtDbObject.deaths,
  };
  response.send(formattedDistrictObject);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId}`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const requestedUpdateDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = requestedUpdateDetails;
  const updateDistrictQuery = `UPDATE district 
        SET
            district_name = "${districtName}",
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE
            district_id = ${districtId};
    `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    SELECT 
        SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
    FROM 
        district
    WHERE 
        state_id = ${stateId};
    `;
  const stats = await db.get(getStatsQuery);
  response.send(stats);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT state_name AS stateName FROM state JOIN district
        WHERE district_id = ${districtId};
    `;
  const districtDbObject = await db.get(getDistrictQuery);
  response.send(districtDbObject);
});

module.exports = app;
