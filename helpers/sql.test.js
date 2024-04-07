const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("SQL Update Clause", function () {
  test("works: all data", function () {
    const result = sqlForPartialUpdate(
      { firstName: "Aliya", age: 32 },
      { firstName: "first_name" }
    );
    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });
  test("works: missing JstoSql", function () {
    const result = sqlForPartialUpdate({
      name: "Apple",
      description: "Tech Company",
    });
    expect(result).toEqual({
      setCols: '"name"=$1, "description"=$2',
      values: ["Apple", "Tech Company"],
    });
  });
  test("fails: missing data", function () {
    function sqlForUpdate() {
      sqlForPartialUpdate({});
    }
    expect(sqlForUpdate).toThrow(BadRequestError);
  });
});
