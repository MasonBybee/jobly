const { BadRequestError } = require("../expressError");

/**  Creates a SQL update clause from an object.
 
 dataToUpdate - contains the fields to update {key: new value}

 jsToSql- maps javascript field names to SQL column names

 returns Object with SQL set clause setCols and values 

 Example: 
 sqlForPartialUpdate({ firstName: 'Aliya', age: 32 }, { firstName: 'first_name' })
 returns { setCols: '"first_name"=$1, "age"=$2', values: ['Aliya', 32] }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql = {}) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
