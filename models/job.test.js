"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
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

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "newJob",
    salary: 0,
    equity: "0.005",
    companyHandle: "c5",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    delete job.id;
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'newJob'`
    );
    expect(result.rows).toEqual([
      {
        title: "newJob",
        salary: 0,
        equity: "0.005",
        companyHandle: "c5",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    jobs.forEach((j) => delete j.id);
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        title: "j2",
        salary: 20000,
        equity: "0.010",
        companyHandle: "c2",
      },
      {
        title: "j3",
        salary: 30000,
        equity: "0",
        companyHandle: "c3",
      },
      {
        title: "test",
        salary: 1000,
        equity: "0.004",
        companyHandle: "c5",
      },
    ]);
  });
  test("works: title filter", async function () {
    const jobs = await Job.findAll({ title: "1" });
    jobs.forEach((j) => delete j.id);
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });
  test("works: minSalary filter", async function () {
    const jobs = await Job.findAll({ minSalary: 20000 });
    jobs.forEach((j) => delete j.id);
    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20000,
        equity: "0.010",
        companyHandle: "c2",
      },
      {
        title: "j3",
        salary: 30000,
        equity: "0",
        companyHandle: "c3",
      },
    ]);
  });
  test("works: hasEquity filter", async function () {
    const jobs = await Job.findAll({ hasEquity: 2 });
    jobs.forEach((j) => delete j.id);
    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20000,
        equity: "0.010",
        companyHandle: "c2",
      },
      {
        title: "test",
        salary: 1000,
        equity: "0.004",
        companyHandle: "c5",
      },
    ]);
  });
  test("works: all filters", async function () {
    const jobs = await Job.findAll({
      title: "j",
      minSalary: 20000,
      hasEquity: true,
    });
    jobs.forEach((j) => delete j.id);
    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20000,
        equity: "0.010",
        companyHandle: "c2",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(jobId);
    delete job.id;
    expect(job).toEqual({
      title: "test",
      salary: 1000,
      equity: "0.004",
      companyHandle: "c5",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("2147483646");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    salary: 50000,
    equity: "0",
  };

  test("works", async function () {
    let job = await Job.update(jobId, updateData);
    expect(job).toEqual({
      title: "test",
      id: jobId,
      companyHandle: "c5",
      ...updateData,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'test'`
    );
    expect(result.rows).toEqual([
      {
        title: "test",
        salary: 50000,
        equity: "0",
        companyHandle: "c5",
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "newTestJob",
      salary: null,
      equity: null,
    };

    let job = await Job.update(jobId, updateDataSetNulls);
    expect(job).toEqual({
      id: jobId,
      companyHandle: "c5",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'newTestJob'`
    );
    expect(result.rows).toEqual([
      {
        title: "newTestJob",
        salary: null,
        equity: null,
        companyHandle: "c5",
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(2147483646, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(jobId, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(jobId);
    const res = await db.query("SELECT title FROM jobs WHERE id=$1", [jobId]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(2147483647);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
