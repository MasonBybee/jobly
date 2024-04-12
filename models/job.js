"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a Job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title, company_handle
           FROM jobs
           WHERE title = $1 AND salary = $2 AND equity = $3 AND company_handle=$4`,
      [title, salary, equity, companyHandle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}, ${companyHandle}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * accepts obj of filters title, minSalary, and hasEquity
   * */

  static async findAll(filterObj) {
    // Initialize an array for parameters and a counter for parameter placeholders
    const params = [];
    let paramCounter = 1;
    const filters = [];

    if (filterObj) {
      const { title, minSalary, hasEquity } = filterObj;

      // Use parameterized queries to prevent SQL injection
      if (title) {
        filters.push(`title ILIKE $${paramCounter}`);
        params.push(`%${title}%`);
        paramCounter++;
      }
      if (minSalary) {
        filters.push(`salary >= $${paramCounter}`);
        params.push(minSalary);
        paramCounter++;
      }
      if (hasEquity) {
        filters.push(`equity > 0`);
        // 'equity > 0' does not require a parameter since it's a static check.
      }
    }

    // If there are filters, add WHERE and join filters with " AND "
    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
        SELECT id, title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        ${whereClause}
        ORDER BY id`;

    // Execute the query with the params array
    const jobsRes = await db.query(query, params);
    return jobsRes.rows;
  }

  //

  /** Given a job title, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_handle",
    });
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                      SET ${setCols}
                      WHERE id = ${idVarIdx}
                      RETURNING id,
                                title,
                                salary,
                                equity,
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
