"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u3Token,
} = require("./_testCommon");

let jobId;
beforeAll(async () => {
  await commonBeforeAll();
  const resp = await db.query(
    `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
    ["test", 1000, "0.004", "c5"]
  );
  jobId = resp.rows[0].id;
});
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */
describe("POST /jobs", function () {
  const newJob = {
    title: "newJob",
    salary: 0,
    equity: "0.005",
    companyHandle: "c4",
  };
  test("works: admin user", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(201);
    delete resp.body.job.id;
    expect(resp.body).toEqual({ job: newJob });
  });

  test("fails: unauth user", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 10,
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        equity: 0.00215,
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    const dataWithoutId = resp.body.jobs.map((j) => {
      delete j.id;
      return j;
    });
    expect({ jobs: dataWithoutId }).toEqual({
      jobs: [
        {
          title: "j1",
          salary: 50000,
          equity: "0",
          companyHandle: "c1",
        },
        {
          title: "j2",
          salary: 100000,
          equity: "0.005",
          companyHandle: "c2",
        },
        {
          title: "j3",
          salary: 150000,
          equity: "0.01",
          companyHandle: "c3",
        },
        {
          title: "test",
          salary: 1000,
          equity: "0.004",
          companyHandle: "c5",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "test",
        salary: 1000,
        equity: "0.004",
        companyHandle: "c5",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/2147483647`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "testNew",
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "testNew",
        salary: 1000,
        equity: "0.004",
        companyHandle: "c5",
      },
    });
  });

  test("fails for users", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "testNew",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/${jobId}`).send({
      title: "testNew",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/2147483647`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: 56,
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.body).toEqual({ deleted: `${jobId}` });
  });

  test("fails for users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/${jobId}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/2147483647`)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
